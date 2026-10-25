import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Creates the self-contained Node server used by Coolify/Hetzner.
  output: "standalone",
};

export default nextConfig;
