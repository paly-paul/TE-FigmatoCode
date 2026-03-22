import { NextResponse } from "next/server";
import { parseResumeFile } from "@/lib/resumeParsing";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
    }

    const parsed = await parseResumeFile(file);
    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
