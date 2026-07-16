import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createLink, listUserLinks, toPublicLink } from '@/lib/links-store';
import { checkRateLimit } from '@/lib/rate-limit';

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const links = await listUserLinks(session.uid);
  return NextResponse.json({ links: links.map((link) => toPublicLink(link, req.nextUrl.origin)) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const allowed = await checkRateLimit(`create-link:${session.uid}`, 30, 60 * 60);
  if (!allowed) {
    return NextResponse.json(
      { error: 'You have created too many links recently. Please try again later.' },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.originalUrl || typeof body.originalUrl !== 'string') {
    return NextResponse.json({ error: 'originalUrl is required.' }, { status: 400 });
  }

  const normalized = normalizeUrl(body.originalUrl);
  try {
    // eslint-disable-next-line no-new
    new URL(normalized);
  } catch {
    return NextResponse.json({ error: 'Please enter a valid URL.' }, { status: 400 });
  }

  if (body.passwordProtected && !body.password) {
    return NextResponse.json({ error: 'Please enter a password.' }, { status: 400 });
  }

  try {
    const link = await createLink({
      originalUrl: normalized,
      ownerUid: session.uid,
      ownerUsername: session.username,
      customAlias: typeof body.customAlias === 'string' ? body.customAlias : undefined,
      password: body.passwordProtected ? String(body.password) : undefined,
      expirationTime: typeof body.expirationTime === 'string' ? body.expirationTime : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
    });

    return NextResponse.json({ link: toPublicLink(link, req.nextUrl.origin) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create link.' },
      { status: 400 },
    );
  }
}
