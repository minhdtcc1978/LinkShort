export const PI_NETWORK_CONFIG = {
  SDK_URL: "https://sdk.minepi.com/pi-sdk.js",
  SDK_LITE_URL: "https://pi-apps.github.io/pi-sdk-lite/build/production/sdklite.js",
  // Set NEXT_PUBLIC_PI_SANDBOX=true only while testing against the Pi Testnet.
  SANDBOX: process.env.NEXT_PUBLIC_PI_SANDBOX === "true",
} as const;
