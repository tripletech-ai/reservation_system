import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Cloudflare Pages 需要確保輸出與 Edge runtime 相容
};

export default nextConfig;
