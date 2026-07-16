export interface PiPlatformUser {
  uid: string;
  username: string;
}

/**
 * Verifies a Pi access token by calling the Pi Platform API directly from our
 * own server (never trust a uid/username the client claims to have — always
 * re-check the token against Pi's servers).
 *
 * https://github.com/pi-apps/pi-platform-docs -> "/v2/me"
 */
export async function verifyPiAccessToken(accessToken: string): Promise<PiPlatformUser | null> {
  if (!accessToken) return null;

  try {
    const res = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.uid || !data?.username) return null;

    return { uid: String(data.uid), username: String(data.username) };
  } catch (error) {
    console.error('[LinkShort] Pi access token verification failed:', error);
    return null;
  }
}
