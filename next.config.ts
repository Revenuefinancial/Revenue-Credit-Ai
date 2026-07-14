import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions default to a 1MB request body, which rejects real
    // phone photos of IDs/documents (typically 2-5MB) before our own
    // handler runs. Raise it above our app-level 10MB cap so the friendly
    // "up to 10 MB" validation is what enforces the ceiling, not a 500.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
