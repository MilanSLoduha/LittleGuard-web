// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {},
  // Ensure Prisma engines are bundled into serverless functions on Vercel
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/.prisma/client/**/*"],
    "app/api/**/route": ["./node_modules/.prisma/client/**/*"]
  }
  //output: "standalone",
}

export default nextConfig
