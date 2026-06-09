// FILE: frontend/next.config.js
// ROLE: Configuration settings for Next.js app, specifying external WebGL map compiled packages.

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['maplibre-gl']
  }
};

module.exports = nextConfig;
