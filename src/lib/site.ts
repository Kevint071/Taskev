// Canonical origin used by sitemap.xml and robots.txt (no trailing slash).
export const SITE_URL = "https://taskev.vercel.app";

export const SITE_NAME = "Taskev";
export const SITE_TITLE =
  "Taskev - Gestor de tareas que te dice cuál hacer primero";
export const SITE_DESCRIPTION =
  "Organiza tus tareas por grupo con prioridad y fecha límite. Taskev las ordena en una lista diaria y te marca las tres que debes hacer primero.";

// Structured data for the public landing; keep it in sync with the page copy.
export const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "es",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      inLanguage: "es",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ],
};
