import { NextRequest, NextResponse } from 'next/server';
import { verifyPiAccessToken } from '@/lib/pi-server-auth';
import { createSessionCookie } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const allowed = await checkRateLimit(`auth:${ip}`, 20, 60 * 15);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const accessToken = body?.accessToken;

  if (!accessToken || typeof accessToken !== 'string') {
    return NextResponse.json({ error: 'Missing Pi accessToken.' }, { status: 400 });
  }

  // Never trust a uid/username sent by the client directly — always re-verify
  // the access token against Pi's own servers.
  const piUser = await verifyPiAccessToken(accessToken);
  if (!piUser) {
    return NextResponse.json({ error: 'Invalid or expired Pi access token.' }, { status: 401 });
  }

  await createSessionCookie(piUser);

  return NextResponse.json({ user: piUser });
}
