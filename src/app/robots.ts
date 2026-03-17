import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/chat/", "/settings/", "/callback/", "/signup/", "/login/"],
    },
    host: "https://bobrchat.com",
    sitemap: "https://bobrchat.com/sitemap.xml",
  };
}
