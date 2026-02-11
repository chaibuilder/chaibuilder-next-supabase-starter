import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { triggerPageGeneration } from "../lib/trigger-page-generation";

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
    triggerPageGeneration(pathsArray, baseUrl, "Revalidate");

    if (redirect) {
      return NextResponse.redirect(req.nextUrl.origin + pathsArray[0]);
    }

    return NextResponse.json({ message: "Tags and paths revalidated successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to revalidate tags and paths" }, { status: 500 });
  }
}
