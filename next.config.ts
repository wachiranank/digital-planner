import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // self-contained server bundle for the Docker image (ignored by Vercel)
  output: "standalone",
};

export default nextConfig;
