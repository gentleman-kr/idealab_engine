import type { NextConfig } from "next";

/** `out/`에 정적 HTML/CSS/JS 생성 → 브라우저·정적 호스팅용 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
