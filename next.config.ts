import type { NextConfig } from "next";

// Bu uygulamadaki her sayfa giriş yapan kişiye özel veriler gösterdiği için
// Cache Components kapalı: sayfalar her istekte sunucuda yeniden oluşturulur.
const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["web-push", "postgres"],
};

export default nextConfig;
