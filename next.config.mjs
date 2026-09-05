/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === 'development';

// Content Security Policy
//
// MongoDB is accessed server-side through Mongoose, so the browser does
// not need to connect directly to MongoDB. Therefore, no MongoDB or
// Supabase domains are required in the browser CSP.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const securityHeaders = [
  // Restricts where scripts, styles, images, and connections can come from.
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },

  // Prevents clickjacking.
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },

  // Prevents MIME-sniffing attacks.
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },

  // Forces HTTPS in production.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },

  // Legacy XSS protection for older browsers.
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },

  // Limits referrer information sent to other origins.
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },

  // This application does not require these browser capabilities.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
];

const nextConfig = {
  reactStrictMode: true,

  // Don't expose the Next.js framework name in the response headers.
  poweredByHeader: false,

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