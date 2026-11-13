/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  async rewrites() {
    // /api/* 요청을 백엔드로 서버사이드 프록시 (브라우저 CORS 없이 동일 출처 유지)
    const target = process.env.API_PROXY_TARGET || "http://flowhub-backend:4000";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
