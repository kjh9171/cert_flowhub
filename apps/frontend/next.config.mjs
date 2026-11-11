/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
