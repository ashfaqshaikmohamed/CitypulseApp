// FILE: frontend/next.config.js
// ROLE: Configuration settings for Next.js app, specifying external WebGL map compiled packages.

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['maplibre-gl']
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'maplibre-gl'
    };
    return config;
  }
};

module.exports = nextConfig;
