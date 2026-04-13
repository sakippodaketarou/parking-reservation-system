import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inviteCode } = body as { inviteCode: string };

    if (!inviteCode) {
      return NextResponse.json({ error: "missing inviteCode" }, { status: 400 });
    }

    const { data: company, error } = await admin
      .from("companies")
      .select("id, name, is_active, code")
      .eq("code", inviteCode)
      .single();

    if (error || !company || !company.is_active) {
      return NextResponse.json({ error: "invalid invite code" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      companyId: company.id,
      companyName: company.name,
    });
  } catch (e) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}