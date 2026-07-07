/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: false,
  serverActions: {
    bodySizeLimit: '10mb',
  },
}

export default nextConfig
