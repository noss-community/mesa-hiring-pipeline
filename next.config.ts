import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Keep pdfjs-dist in Node.js — it uses import.meta and canvas which webpack can't bundle
  serverExternalPackages: ['pdfjs-dist'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
