/**
 * Triggers GET requests to force Next.js to regenerate static pages
 * @param slugs - Array of page slugs to trigger
 * @param baseUrl - Base URL of the application
 * @param source - Source of the trigger (for logging)
 */
export async function triggerPageGeneration(
  slugs: string[],
  baseUrl: string,
  source: string = "Revalidate",
) {
  const validSlugs = slugs.filter((slug) => {
    // Filter out empty, THEME, or invalid slugs
    if (!slug || slug.trim() === "" || slug === "THEME") {
      return false;
    }
    return true;
  });

  if (validSlugs.length === 0) {
    return;
  }

  // Trigger GET requests in parallel but don't await them to avoid blocking
  const requests = validSlugs.map(async (slug) => {
    try {
      const url = `${baseUrl}${slug}`;
      console.log(`[${source}] Triggering page generation for: ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "ChaiBuilder-PageGeneration",
        },
      });
      if (!response.ok) {
        console.warn(
          `[${source}] Failed to generate ${url}: ${response.status}`,
        );
      }
    } catch (error) {
      console.error(
        `[${source}] Error triggering generation for ${slug}:`,
        error,
      );
    }
  });

  // Fire and forget - use allSettled to ensure all requests complete independently
  Promise.allSettled(requests).catch((error) => {
    console.error(`[${source}] Error in page generation batch:`, error);
  });
}
