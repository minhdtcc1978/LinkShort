import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { getLinkByCode, incrementClicks, isLinkExpired, verifyLinkPassword } from '@/lib/links-store';

// Always look up the link fresh on every request instead of using any
// static/ISR cache - short links must reflect the latest state immediately.
export const dynamic = 'force-dynamic';

function StatusCard({ icon, title, message }: { icon: ReactNode; title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
      <Card className="w-full max-w-md space-y-4 border-purple-500/20 bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30">
          {icon}
        </div>
        <div>
          <h1 className="mb-2 text-2xl font-bold">{title}</h1>
          <p className="text-sm text-gray-400">{message}</p>
        </div>
        <Button asChild variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-200">
          <Link href="/">Back to LinkShort</Link>
        </Button>
      </Card>
    </main>
  );
}

export default async function RedirectPage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { error?: string };
}) {
  const code = decodeURIComponent(params.code || '');
  const link = await getLinkByCode(code);

  if (!link) {
    return (
      <StatusCard
        icon={<AlertTriangle className="h-7 w-7 text-yellow-300" />}
        title="Link Not Found"
        message="This short link doesn't exist, or it may have been deleted by its owner."
      />
    );
  }

  if (isLinkExpired(link)) {
    return (
      <StatusCard
        icon={<AlertTriangle className="h-7 w-7 text-red-300" />}
        title="Link Expired"
        message="This smart link is no longer active."
      />
    );
  }

  // No password required: redirect immediately, server-side, before any HTML
  // is sent. This works for every visitor on every device/browser, including
  // link previews, since it's a real HTTP redirect rather than a client-side
  // localStorage lookup.
  if (!link.passwordHash) {
    await incrementClicks(code);
    redirect(link.originalUrl);
  }

  async function unlockAction(formData: FormData) {
    'use server';

    const password = String(formData.get('password') || '');
    const target = await getLinkByCode(code);

    if (!target) redirect(`/s/${encodeURIComponent(code)}?error=not-found`);
    if (isLinkExpired(target!)) redirect(`/s/${encodeURIComponent(code)}?error=expired`);

    const ok = await verifyLinkPassword(target!, password);
    if (!ok) redirect(`/s/${encodeURIComponent(code)}?error=wrong-password`);

    await incrementClicks(code);
    redirect(target!.originalUrl);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
      <Card className="w-full max-w-md border-purple-500/20 bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30">
          <Lock className="h-7 w-7 text-purple-300" />
        </div>

        <form action={unlockAction} className="space-y-4">
          <div>
            <h1 className="mb-2 text-2xl font-bold">Protected Link</h1>
            <p className="text-sm text-gray-400">Enter the password to continue.</p>
          </div>
          <Input
            type="password"
            name="password"
            placeholder="Password"
            className="border-purple-500/30 bg-input text-white placeholder:text-gray-500"
            autoFocus
          />
          {searchParams?.error === 'wrong-password' && (
            <p className="text-sm text-red-300">Incorrect password.</p>
          )}
          {searchParams?.error === 'expired' && (
            <p className="text-sm text-red-300">This link just expired.</p>
          )}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
          >
            Unlock Link
          </Button>
        </form>
      </Card>
    </main>
  );
}
