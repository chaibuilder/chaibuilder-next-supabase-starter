import { getSupabaseAdmin } from "@/app/supabase-admin";
import "@/data/global";
import { registerPageTypes } from "@/page-types";
import {
  ChaiActionsRegistry,
  initChaiBuilderActionHandler,
} from "@chaibuilder/next/actions";
import {
  SupabaseAuthActions,
  SupabaseStorageActions,
} from "@chaibuilder/next/actions/supabase";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { triggerPageGeneration } from "./lib/trigger-page-generation";

registerPageTypes();

const supabase = getSupabaseAdmin();
ChaiActionsRegistry.registerActions(SupabaseAuthActions(supabase));
ChaiActionsRegistry.registerActions(SupabaseStorageActions(supabase));

export async function POST(req: NextRequest) {
  const apiKey = process.env.CHAIBUILDER_APP_KEY;

  if (!apiKey) {
    console.error("CHAIBUILDER_APP_KEY environment variable is not set.");
    return NextResponse.json(
      { error: "Server misconfiguration: CHAIBUILDER_APP_KEY is not set" },
      { status: 500 },
    );
  }
  try {
    // Get authorization header
    const authorization = req.headers.get("authorization") || "";
    let authTokenOrUserId: string = "";
    authTokenOrUserId = authorization ? authorization.split(" ")[1] : "";

    // Parse request body
    const body = await req.json();

    // Supabase authentication check
    const supabase = getSupabaseAdmin();
    const supabaseUser = await supabase.auth.getUser(authTokenOrUserId);
    if (supabaseUser.error) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }
    authTokenOrUserId = supabaseUser.data.user?.id || "";

    const handleAction = initChaiBuilderActionHandler({
      apiKey,
      userId: authTokenOrUserId,
    });
    const response = await handleAction(body);
    if (response && "tags" in response && Array.isArray(response.tags)) {
      response.tags.forEach((tag: string) => {
        revalidateTag(tag, "max");
      });

      // Trigger GET requests to force page generation after tag revalidation
      // Note: In ChaiBuilder, tags often correspond to page slugs
      const baseUrl = req.nextUrl.origin;
      triggerPageGeneration(response.tags, baseUrl, "Publish");
    }

    // Handle streaming responses
    if (response?._streamingResponse && response?._streamResult) {
      const result = response._streamResult;

      if (!result?.textStream) {
        return NextResponse.json(
          { error: "No streaming response available" },
          { status: 500 },
        );
      }

      // Create a ReadableStream for streaming response
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of result.textStream) {
              if (chunk) {
                controller.enqueue(encoder.encode(chunk));
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    return NextResponse.json(response, { status: response.status ?? 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
