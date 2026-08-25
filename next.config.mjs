/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.shopify.com' }, { protocol: 'https', hostname: 'bellsofsteel.com' }] },
};
export default nextConfig;
