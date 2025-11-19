// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { isServer }) {
    if (isServer) {
      // Toto úplne vyrieši tvoj problém s rhel-openssl-3.0.x na Verceli
      config.plugins.push(
        new (require("webpack").DefinePlugin)({
          "process.env.PRISMA_SKIP_ENGINE_COPY": JSON.stringify("true"),
        })
      );
    }
    return config;
  },
};

export default nextConfig;