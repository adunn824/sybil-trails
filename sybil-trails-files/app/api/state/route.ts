import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getState, sanitize, setState } from "@/lib/state";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getState();
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  const next = sanitize(body);
  await setState(next);
  revalidatePath("/");
  return NextResponse.json(next);
}
