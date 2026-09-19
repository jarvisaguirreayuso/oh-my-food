import type { MetadataRoute } from "next";

// Places, dishes and their general averages are public on purpose (docs/plan-fase-2-social.md,
// B.9 #3 a) so they can be found; everything personal or social is not for crawlers. Anything
// published stays in caches and search indexes even if it is later removed, so keep this list
// conservative when adding new public surfaces.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explore", "/places/", "/dishes/", "/map"],
      disallow: ["/me", "/u/", "/people", "/lists", "/visits/", "/auth/"],
    },
  };
}
