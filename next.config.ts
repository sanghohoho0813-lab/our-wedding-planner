import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [
      {
        // 서비스 워커는 항상 최신 파일을 확인하게 한다(캐시되면 업데이트가 늦어진다)
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  experimental: {
    // 클라이언트 라우터 캐시: 한 번 prefetch 한 화면은 다시 서버에 묻지 않는다.
    staleTimes: { dynamic: 300, static: 300 },
  },
};

export default nextConfig;
