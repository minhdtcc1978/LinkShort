'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link2,
  Copy,
  Check,
  Zap,
  Lock as LockIcon,
  Clock as ClockIcon,
  QrCode as QRCodeIcon,
  ExternalLink,
  Trash2,
  ShieldCheck,
  LogIn,
  LogOut,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { AdvancedLinkCreation } from './advanced-link-creation';
import { QRCodeGenerator } from './qr-code-generator';
import { usePiAuth } from '@/contexts/pi-auth-context';
import dynamic from 'next/dynamic';

const AnalyticsDashboard = dynamic(
  () => import('./analytics-dashboard').then((mod) => mod.AnalyticsDashboard),
  { ssr: false },
);

interface ShortenedLink {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  clicks: number;
  createdAt: string;
  customAlias?: string;
  description?: string;
  passwordProtected?: boolean;
  expiresAt?: string;
}

interface AdvancedOptions {
  customAlias?: string;
  passwordProtected?: boolean;
  password?: string;
  expirationTime?: string;
  description?: string;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below for mobile webviews / Pi Browser preview.
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

export function URLShortener() {
  const { user, status: authStatus, errorMessage: authError, isPiBrowser, login, logout } = usePiAuth();

  const [originalUrl, setOriginalUrl] = useState('');
  const [links, setLinks] = useState<ShortenedLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!user) {
      setLinks([]);
      return;
    }
    setLinksLoading(true);
    try {
      const res = await fetch('/api/links');
      if (!res.ok) throw new Error('Failed to load links');
      const data = await res.json();
      setLinks(data.links || []);
    } catch (error) {
      console.error(error);
      toast.error('Could not load your links.');
    } finally {
      setLinksLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const activeOptionsCount = useMemo(() => {
    if (!advancedOptions) return 0;
    return [
      advancedOptions.customAlias,
      advancedOptions.passwordProtected,
      advancedOptions.expirationTime,
      advancedOptions.description,
    ].filter(Boolean).length;
  }, [advancedOptions]);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in with your Pi Network account first.');
      return;
    }

    const normalized = normalizeUrl(originalUrl);
    if (!normalized) {
      toast.error('Please enter a URL');
      return;
    }
    try {
      // eslint-disable-next-line no-new
      new URL(normalized);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl: normalized,
          customAlias: advancedOptions?.customAlias,
          passwordProtected: advancedOptions?.passwordProtected,
          password: advancedOptions?.password,
          expirationTime: advancedOptions?.expirationTime,
          description: advancedOptions?.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to shorten link');
        return;
      }

      setLinks((prev) => [data.link, ...prev]);
      setOriginalUrl('');
      setAdvancedOptions(null);
      toast.success('Link shortened successfully!');
    } catch (error) {
      toast.error('Failed to shorten link');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, linkId: string) => {
    const ok = await copyText(text);
    if (!ok) {
      toast.error('Copy failed. Please long-press and copy manually.');
      return;
    }
    setCopiedId(linkId);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteLink = async (shortCode: string) => {
    try {
      const res = await fetch(`/api/links/${encodeURIComponent(shortCode)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete link');
      setLinks((prev) => prev.filter((link) => link.shortCode !== shortCode));
      toast.success('Link deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete link');
    }
  };

  const openShortLink = (shortUrl: string) => {
    window.open(shortUrl, '_blank', 'noopener,noreferrer');
  };

  const isLinkExpired = (link: ShortenedLink) => {
    return Boolean(link.expiresAt && Date.now() > new Date(link.expiresAt).getTime());
  };

  const featureCards = [
    {
      title: 'Custom Link',
      description: 'Create branded short links with custom aliases',
      icon: <Link2 className="w-6 h-6 text-purple-400" />,
      style: 'from-purple-500/20 to-blue-500/20',
    },
    {
      title: 'Password Protection',
      description: 'Secure links before redirecting visitors',
      icon: <LockIcon className="w-6 h-6 text-blue-400" />,
      style: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      title: 'Set Expiration',
      description: 'Links automatically expire after your selected time',
      icon: <ClockIcon className="w-6 h-6 text-cyan-400" />,
      style: 'from-cyan-500/20 to-purple-500/20',
    },
    {
      title: 'Generate QR Code',
      description: 'Create scannable QR codes instantly',
      icon: <QRCodeIcon className="w-6 h-6 text-pink-400" />,
      style: 'from-purple-500/20 to-pink-500/20',
    },
  ];

  return (
    <main className="w-full min-h-screen bg-background text-white">
      <section className="relative overflow-hidden px-4 py-8 md:py-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-full w-full max-w-4xl -translate-x-1/2">
            <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-gradient-to-br from-purple-600/25 to-blue-600/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-gradient-to-tl from-blue-600/25 to-purple-600/10 blur-3xl" />
          </div>
        </div>

        <div className="mx-auto mb-12 max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center justify-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-purple-300">Smart Link Shortening</span>
          </div>

          <h1 className="mb-4 text-4xl font-bold leading-tight md:text-6xl">
            LinkShort
            <span className="mt-2 block bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              SMART LINKS
            </span>
          </h1>

          <p className="mb-6 text-lg leading-relaxed text-gray-300 md:text-xl">
            Transform your long links into powerful URLs
          </p>

          {/* Pi Network auth banner */}
          <div className="mx-auto mb-6 flex max-w-xl flex-col items-center justify-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-200 sm:flex-row sm:justify-between">
            {user ? (
              <>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Signed in as <span className="font-semibold text-white">@{user.username}</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={logout}
                  className="border-purple-500/30 bg-transparent text-purple-200 hover:bg-purple-500/20"
                >
                  <LogOut className="mr-1 h-3.5 w-3.5" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <span>Sign in with Pi Network to create and manage your links.</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={login}
                  disabled={authStatus === 'authenticating' || authStatus === 'checking'}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                >
                  {authStatus === 'authenticating' ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogIn className="mr-1 h-3.5 w-3.5" />
                  )}
                  Sign in with Pi
                </Button>
              </>
            )}
          </div>

          {authStatus === 'error' && authError && (
            <p className="mx-auto mb-6 max-w-xl text-xs text-red-300">
              {authError}
              {!isPiBrowser && ' Pi Network login only completes inside Pi Browser or Pi App Studio.'}
            </p>
          )}

          <form onSubmit={handleShorten} className="mb-5 flex flex-col gap-3">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Link2 className="h-5 w-5" />
              </div>
              <Input
                type="text"
                inputMode="url"
                placeholder="Paste your URL here..."
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                className="h-14 border-purple-500/30 bg-input pl-12 text-white placeholder:text-gray-500 focus:border-purple-400"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                disabled={loading || !user}
                className="h-14 flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-lg font-semibold text-white transition-all duration-300 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? 'Shortening...' : user ? 'Shorten Now' : 'Sign in to shorten'}
              </Button>

              <AdvancedLinkCreation onLinkCreated={setAdvancedOptions} disabled={!user} />
            </div>
          </form>

          {activeOptionsCount > 0 && (
            <div className="mx-auto mb-8 flex max-w-xl items-center justify-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-200">
              <ShieldCheck className="h-4 w-4" />
              {activeOptionsCount} advanced option{activeOptionsCount > 1 ? 's' : ''} ready. Press “Shorten Now” to apply.
            </div>
          )}
        </div>

        <div className="mx-auto mb-16 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => (
            <Card
              key={feature.title}
              className="border-purple-500/20 bg-card p-6 transition-colors hover:border-purple-500/40"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.style}`}>
                {feature.icon}
              </div>
              <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </Card>
          ))}
        </div>

        {!user ? (
          <div className="mx-auto max-w-6xl py-12 text-center">
            <p className="text-gray-400">Sign in with Pi Network to see and manage your link history.</p>
          </div>
        ) : linksLoading ? (
          <div className="mx-auto max-w-6xl py-12 text-center">
            <p className="text-gray-400">Loading your links…</p>
          </div>
        ) : links.length > 0 ? (
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Link History</h2>
              <span className="text-sm text-gray-400">{links.length} links</span>
            </div>

            <div className="space-y-3">
              {links.map((link) => (
                <Card
                  key={link.id}
                  className={`group flex flex-col gap-4 border-purple-500/20 bg-card p-4 transition-colors hover:border-purple-500/40 md:flex-row md:items-center ${
                    isLinkExpired(link) ? 'opacity-50' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-mono text-sm font-semibold text-white md:text-base">
                        {link.shortUrl}
                      </p>
                      {link.passwordProtected && (
                        <span className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-300">Protected</span>
                      )}
                      {isLinkExpired(link) && (
                        <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300">Expired</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {link.description ? `${link.description} — ` : ''}
                      {link.originalUrl}
                    </p>
                    {link.expiresAt && (
                      <p className="text-xs text-gray-500">
                        Expires: {new Date(link.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 md:flex-nowrap">
                    <span>{link.clicks || 0} clicks</span>
                  </div>

                  <div className="flex flex-wrap gap-2 md:flex-nowrap">
                    <Button
                      type="button"
                      onClick={() => openShortLink(link.shortUrl)}
                      variant="outline"
                      size="sm"
                      className="border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
                    >
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Open
                    </Button>

                    <Button
                      type="button"
                      onClick={() => copyToClipboard(link.shortUrl, link.id)}
                      variant="outline"
                      size="sm"
                      className="border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200"
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check className="mr-1 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>

                    <QRCodeGenerator shortUrl={link.shortUrl} originalUrl={link.originalUrl} />

                    <Button
                      type="button"
                      onClick={() => deleteLink(link.shortCode)}
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl py-12 text-center">
            <p className="text-gray-400">No links created yet. Start by shortening your first URL!</p>
          </div>
        )}

        {user && links.length > 0 && <AnalyticsDashboard links={links} />}
      </section>
    </main>
  );
}
