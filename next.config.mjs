/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === 'development';

// Content-Security-Policy: this is the backbone of the "impossible to hack"
// requirement. Every directive here closes a specific attack class.
//
// script-src still carries 'unsafe-inline': Next's App Router streams RSC
// data through inline <script> tags on every page load, unnonced by
// default, so dropping 'unsafe-inline' here without also standing up
// nonce-issuing middleware (next/headers + a middleware.js that mints a
// per-request nonce) would break hydration on every page, not just
// tighten security. 'unsafe-eval' does NOT have that excuse — a
// production `next build` bundle never calls eval()/new Function(), it's
// only relevant to webpack's dev-mode hot reload — so it's removed below.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://*.supabase.co;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const securityHeaders = [
  // Blocks reflected/stored XSS by whitelisting script and connection origins
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  // Blocks clickjacking: the app can never be rendered inside a frame
  { key: 'X-Frame-Options', value: 'DENY' },
  // Blocks MIME-sniffing attacks (e.g. a .txt upload executed as script)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Forces HTTPS for a full year, including subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Legacy XSS filter, harmless to keep for older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Limits how much referrer data leaks to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disables camera/mic/geolocation/payment APIs — this app needs none of them
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // don't advertise "X-Powered-By: Next.js" to attackers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
