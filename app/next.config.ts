import pkg from './package.json'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    version: pkg.version,
  },
  output: 'standalone',
  experimental: {
    nodeMiddleware: true, // TODO: remove this
  },
}

export default nextConfig
