/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  },
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
