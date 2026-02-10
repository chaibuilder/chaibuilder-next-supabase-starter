import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Triggers GET requests to force Next.js to regenerate static pages
 * @param slugs - Array of page slugs to trigger
 * @param baseUrl - Base URL of the application
 */
async function triggerPageGeneration(slugs: string[], baseUrl: string) {
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
      console.log(`[Revalidate] Triggering page generation for: ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "ChaiBuilder-Revalidation",
        },
      });
      if (!response.ok) {
        console.warn(`[Revalidate] Failed to generate ${url}: ${response.status}`);
      }
    } catch (error) {
      console.error(`[Revalidate] Error triggering generation for ${slug}:`, error);
    }
  });

  // Fire and forget - don't block the response
  Promise.all(requests).catch((error) => {
    console.error("[Revalidate] Error in page generation batch:", error);
  });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.CHAIBUILDER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json();
  const tags = body.tags || "";
  const paths = body.paths || "";
  const redirect = body.redirect || false;

  try {
    const tagsArray = Array.isArray(tags) ? tags : tags.split(",");
    await Promise.all(tagsArray.map((tag: string) => revalidateTag(tag, "max")));

    const pathsArray = Array.isArray(paths) ? paths : paths.split(",");
    await Promise.all(pathsArray.map((path: string) => revalidatePath(path)));

    // Trigger GET requests to force page generation after cache invalidation
    const baseUrl = req.nextUrl.origin;
    triggerPageGeneration(pathsArray, baseUrl);

    if (redirect) {
      return NextResponse.redirect(req.nextUrl.origin + pathsArray[0]);
    }

    return NextResponse.json({ message: "Tags and paths revalidated successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to revalidate tags and paths" }, { status: 500 });
  }
}
