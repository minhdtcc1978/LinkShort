import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { deleteLink } from '@/lib/links-store';

export async function DELETE(_req: NextRequest, { params }: { params: { code: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ok = await deleteLink(session.uid, decodeURIComponent(params.code));
  if (!ok) {
    return NextResponse.json({ error: 'Link not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
