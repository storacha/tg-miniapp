import { version } from './package.json'

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    version
  },
  output: 'standalone',
  experimental: {
    nodeMiddleware: true, // TODO: remove this
  },
}

export default nextConfig
