import { NextResponse } from "next/server";
import { UserFacingError } from "@/lib/pipeline/config";
import { MAX_QUESTION_LENGTH, askSaved } from "@/lib/pipeline/ask";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { question } = (await request.json()) as { question?: string };
  const clean = question?.trim().slice(0, MAX_QUESTION_LENGTH);
  if (!clean) return NextResponse.json({ error: "Type a question first." }, { status: 400 });

  try {
    // Row-level security still limits the item read to this person.
    const { answer, items } = await askSaved(createAdminClient(), supabase, user.id, clean, "web");
    return NextResponse.json({ answer, items: items.map(({ id, title }) => ({ id, title })) });
  } catch (error) {
    if (error instanceof UserFacingError) return NextResponse.json({ error: error.message }, { status: 429 });
    console.error("Ask failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Tick couldn’t answer that. Please try again." }, { status: 500 });
  }
}
