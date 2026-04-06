/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  trailingSlash: true,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
