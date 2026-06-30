/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow Prisma in server components / route handlers
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
    // Tree-shake heavy libraries with many named exports → smaller chunks, faster
    // parse/hydrate on the client.
    optimizePackageImports: ["recharts", "@react-three/drei"],
  },
};

export default nextConfig;
