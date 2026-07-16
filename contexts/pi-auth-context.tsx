'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { PI_NETWORK_CONFIG } from '@/lib/system-config';

export interface PiUser {
  uid: string;
  username: string;
}

export type PiAuthStatus = 'checking' | 'idle' | 'authenticating' | 'ready' | 'error';

interface PiAuthContextType {
  user: PiUser | null;
  status: PiAuthStatus;
  errorMessage: string | null;
  isPiBrowser: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const PiAuthContext = createContext<PiAuthContextType | undefined>(undefined);

let sdkLoadPromise: Promise<void> | null = null;

function loadPiSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.Pi) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PI_NETWORK_CONFIG.SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error('Failed to load the Pi SDK script.'));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

function onIncompletePaymentFound(payment: unknown) {
  // This app doesn't sell anything, so there's nothing to complete.
  // Logged for visibility in case Pi Platform ever surfaces a stray payment.
  console.warn('[LinkShort] Incomplete Pi payment found (unused by this app):', payment);
}

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PiUser | null>(null);
  const [status, setStatus] = useState<PiAuthStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPiBrowser, setIsPiBrowser] = useState(false);

  // Non-blocking: silently check for an existing session cookie on mount.
  // The rest of the UI renders immediately regardless of the outcome here.
  useEffect(() => {
    setIsPiBrowser(typeof navigator !== 'undefined' && /PiBrowser/i.test(navigator.userAgent));

    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data?.user) {
          setUser(data.user);
          setStatus('ready');
          return;
        }
      } catch {
        // Ignore — user simply isn't logged in yet.
      }
      setStatus('idle');
    })();
  }, []);

  const login = useCallback(async () => {
    setStatus('authenticating');
    setErrorMessage(null);

    try {
      await loadPiSdk();
      if (!window.Pi) throw new Error('Pi SDK is unavailable.');

      window.Pi.init({ version: '2.0', sandbox: PI_NETWORK_CONFIG.SANDBOX });

      const auth = await window.Pi.authenticate(['username'], onIncompletePaymentFound);

      const res = await fetch('/api/auth/pi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: auth.accessToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Pi Network verification failed.');
      }

      setUser(data.user);
      setStatus('ready');
    } catch (err) {
      console.error('[LinkShort] Pi login failed:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Login with Pi Network failed. Please try again.',
      );
      setStatus('error');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setStatus('idle');
    }
  }, []);

  const value: PiAuthContextType = {
    user,
    status,
    errorMessage,
    isPiBrowser,
    login,
    logout,
  };

  return <PiAuthContext.Provider value={value}>{children}</PiAuthContext.Provider>;
}

export function usePiAuth() {
  const context = useContext(PiAuthContext);
  if (context === undefined) {
    throw new Error('usePiAuth must be used within a PiAuthProvider');
  }
  return context;
}
