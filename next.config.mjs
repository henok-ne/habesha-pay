/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,   // ESLint warnings won't block deployment
  },
}

export default nextConfig