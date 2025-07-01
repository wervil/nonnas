import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  images: {
    domains: ['zcejeej0ras6rj8h.public.blob.vercel-storage.com'],
  },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
