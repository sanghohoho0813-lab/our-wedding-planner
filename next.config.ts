import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  experimental: {
    // 클라이언트 라우터 캐시: 한 번 prefetch 한 화면은 다시 서버에 묻지 않는다.
    staleTimes: { dynamic: 300, static: 300 },
  },
};

export default nextConfig;
