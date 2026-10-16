import type { NextConfig } from "next";

const supabaseHost = (() => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.hostname : undefined;
  } catch {
    return undefined;
  }
})();
const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : '';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com;
    script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: ${supabaseOrigin} https://www.facebook.com https://connect.facebook.net https://www.google-analytics.com https://www.googletagmanager.com;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://www.facebook.com;
    frame-ancestors 'none';
    frame-src 'self' https://www.openstreetmap.org https://www.googletagmanager.com https://www.facebook.com;
    connect-src 'self' https://yirbztzrgsvxuetqqiov.supabase.co https://www.google-analytics.com https://graph.facebook.com https://www.googletagmanager.com https://www.google.com https://mpc2-prod-26-is5qnl632q-uc.a.run.app https://5z-2b6b7616f94640c2840d1841e1ac24c3.ecs.us-east-1.on.aws;
    upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { optimizePackageImports: ['lucide-react', 'recharts'] },
  turbopack: {
    resolveAlias: {
      '../build/polyfills/polyfill-module': './lib/modern-polyfill.js',
      'next/dist/build/polyfills/polyfill-module': './lib/modern-polyfill.js',
    },
  },
  images: {
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: 'https' as const, hostname: supabaseHost }] : []),
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
