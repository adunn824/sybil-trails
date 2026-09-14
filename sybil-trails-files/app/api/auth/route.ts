import { NextResponse } from "next/server";
import { COOKIE, isAuthed, makeToken, passwordMatches } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ authed: await isAuthed(), configured: !!process.env.ADMIN_PASSWORD });
}

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not set on the server yet." }, { status: 500 });
  }
  if (!passwordMatches(String(password ?? ""))) {
    return NextResponse.json({ error: "That password didn't match." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 86400,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
