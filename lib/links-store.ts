import 'server-only';
import bcrypt from 'bcryptjs';
import { kv } from '@/lib/kv';

export interface StoredLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  ownerUid: string;
  ownerUsername: string;
  customAlias?: string;
  description?: string;
  passwordHash?: string;
  expiresAt?: string;
  clicks: number;
  createdAt: string;
}

export interface PublicLink {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  ownerUsername: string;
  customAlias?: string;
  description?: string;
  passwordProtected: boolean;
  expiresAt?: string;
  clicks: number;
  createdAt: string;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_ALIAS_LENGTH = 32;

const linkKey = (code: string) => `link:${code.toLowerCase()}`;
const userLinksKey = (uid: string) => `user:${uid}:links`;

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

function slugify(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, MAX_ALIAS_LENGTH);
}

const DURATIONS_MS: Record<string, number> = {
  '1hour': 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
  '7days': 7 * 24 * 60 * 60 * 1000,
  '30days': 30 * 24 * 60 * 60 * 1000,
};

function calculateExpiration(timeframe?: string): string | undefined {
  if (!timeframe || timeframe === 'never') return undefined;
  const ms = DURATIONS_MS[timeframe];
  return ms ? new Date(Date.now() + ms).toISOString() : undefined;
}

export async function getLinkByCode(code: string): Promise<StoredLink | null> {
  if (!code) return null;
  const data = await kv.get<StoredLink>(linkKey(code));
  return data ?? null;
}

export async function listUserLinks(uid: string): Promise<StoredLink[]> {
  const codes = await kv.smembers(userLinksKey(uid));
  const links = await Promise.all(codes.map((code) => getLinkByCode(code)));
  return links
    .filter((link): link is StoredLink => Boolean(link))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface CreateLinkInput {
  originalUrl: string;
  ownerUid: string;
  ownerUsername: string;
  customAlias?: string;
  password?: string;
  expirationTime?: string;
  description?: string;
}

export async function createLink(input: CreateLinkInput): Promise<StoredLink> {
  let code: string;

  if (input.customAlias) {
    code = slugify(input.customAlias);
    if (code.length < 3) {
      throw new Error('Custom alias must contain at least 3 valid characters.');
    }
    const existing = await getLinkByCode(code);
    if (existing) {
      throw new Error('This alias is already taken.');
    }
  } else {
    let attempts = 0;
    do {
      code = randomCode();
      attempts += 1;
      if (attempts > 10) throw new Error('Could not generate a unique short code, please try again.');
      // eslint-disable-next-line no-await-in-loop
    } while (await getLinkByCode(code));
  }

  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;

  const link: StoredLink = {
    id: `${Date.now()}-${code}`,
    shortCode: code,
    originalUrl: input.originalUrl,
    ownerUid: input.ownerUid,
    ownerUsername: input.ownerUsername,
    customAlias: input.customAlias ? code : undefined,
    description: input.description || undefined,
    passwordHash,
    expiresAt: calculateExpiration(input.expirationTime),
    clicks: 0,
    createdAt: new Date().toISOString(),
  };

  await kv.set(linkKey(code), link);
  await kv.sadd(userLinksKey(input.ownerUid), code);

  return link;
}

export async function deleteLink(uid: string, code: string): Promise<boolean> {
  const link = await getLinkByCode(code);
  if (!link || link.ownerUid !== uid) return false;

  await kv.del(linkKey(code));
  await kv.srem(userLinksKey(uid), code);
  return true;
}

export async function incrementClicks(code: string): Promise<void> {
  const link = await getLinkByCode(code);
  if (!link) return;
  link.clicks = (link.clicks || 0) + 1;
  await kv.set(linkKey(code), link);
}

export async function verifyLinkPassword(link: StoredLink, password: string): Promise<boolean> {
  if (!link.passwordHash) return true;
  if (!password) return false;
  return bcrypt.compare(password, link.passwordHash);
}

export function isLinkExpired(link: Pick<StoredLink, 'expiresAt'>): boolean {
  return Boolean(link.expiresAt && Date.now() > new Date(link.expiresAt).getTime());
}

export function toPublicLink(link: StoredLink, baseUrl: string): PublicLink {
  return {
    id: link.id,
    shortCode: link.shortCode,
    shortUrl: `${baseUrl}/s/${link.shortCode}`,
    originalUrl: link.originalUrl,
    ownerUsername: link.ownerUsername,
    customAlias: link.customAlias,
    description: link.description,
    passwordProtected: Boolean(link.passwordHash),
    expiresAt: link.expiresAt,
    clicks: link.clicks,
    createdAt: link.createdAt,
  };
}
