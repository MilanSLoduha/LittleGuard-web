// next.config.js
const { withPrisma } = require('@prisma/nextjs-monorepo-workaround-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {

};

module.exports = withPrisma(nextConfig);