/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
      nodeMiddleware: true,
  }
}

export default nextConfig
