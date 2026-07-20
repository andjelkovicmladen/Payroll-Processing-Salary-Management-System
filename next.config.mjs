/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  experimental: {
    // @react-pdf/renderer and exceljs are server-only heavy libs.
    serverComponentsExternalPackages: ["@react-pdf/renderer", "exceljs"],
  },
  eslint: {
    // Lint is enforced in CI; don't block production builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
