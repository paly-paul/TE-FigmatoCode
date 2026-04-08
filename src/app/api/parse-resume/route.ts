import { NextResponse } from "next/server";
import { parseResumeFile } from "@/lib/resumeParsing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const started = Date.now();
  console.info("[resume-parse:api] POST begin", { url: request.url });

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      console.warn("[resume-parse:api] missing or invalid file field", {
        type: typeof file,
        value: file,
      });
      return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
    }

    console.info("[resume-parse:api] file received", {
      name: file.name,
      size: file.size,
      type: file.type || "(empty)",
    });

    const parsed = await parseResumeFile(file);

    const keys = Object.keys(parsed);
    console.info("[resume-parse:api] parse complete", {
      ms: Date.now() - started,
      fieldCount: keys.length,
      fields: keys,
    });
    console.info("[resume-parse:api] parsed payload:", JSON.stringify(parsed, null, 2));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[resume-parse:api] error", {
      ms: Date.now() - started,
      error,
    });
    const message = error instanceof Error ? error.message : "Unable to parse resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
