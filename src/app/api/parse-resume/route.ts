import { NextResponse } from "next/server";
import { parseResumeFile } from "@/lib/resumeParsing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
    }

    console.log("API Route: Received file:", file.name, "Size:", file.size, "Type:", file.type);

    const parsed = await parseResumeFile(file);

    console.log("API Route: Parsing complete. Fields:", Object.keys(parsed));
    console.log("API Route: Full parsed data:", JSON.stringify(parsed, null));

    return NextResponse.json(parsed, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("API Route: Error parsing resume:", error);
    const message = error instanceof Error ? error.message : "Unable to parse resume.";
    const isUserInputParseIssue =
      /Unsupported file type|could not be read clearly|Unable to extract readable text/i.test(
        message
      );
    return NextResponse.json(
      { error: message },
      {
        status: isUserInputParseIssue ? 422 : 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }
}
