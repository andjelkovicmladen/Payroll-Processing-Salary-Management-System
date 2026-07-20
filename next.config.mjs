/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // @react-pdf/renderer and exceljs are server-only heavy libs.
  serverExternalPackages: ["@react-pdf/renderer", "exceljs"],
  eslint: {
    // Lint is enforced in CI; don't block production builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
