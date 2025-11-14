/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecommerce/shared'],
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
};

module.exports = nextConfig;