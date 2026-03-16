import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), '@prisma/client', 'bcrypt'];
    return config;
  },
};

export default nextConfig;
