/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // xlsx and recharts are heavy client libs; keep them out of the server bundle where possible.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

module.exports = nextConfig;
