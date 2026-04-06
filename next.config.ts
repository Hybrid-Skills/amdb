import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'img.omdbapi.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
      },
    ],
  },
};

export default nextConfig;
