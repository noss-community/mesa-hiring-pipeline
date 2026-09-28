import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Keep pdfjs-dist in Node.js — it uses import.meta and canvas which webpack can't bundle
  serverExternalPackages: ['pdfjs-dist'],
  // Force-include the pdf.js worker file in the deployed bundle — Vercel's
  // file tracer can't follow pdfjs-dist's own dynamic import of it.
  outputFileTracingIncludes: {
    '/api/upload': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
