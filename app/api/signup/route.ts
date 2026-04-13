import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, inviteCode } = body as {
      email: string;
      password: string;
      inviteCode: string;
    };

    console.log("signup body:", { email, passwordExists: !!password, inviteCode });

    if (!email || !password || !inviteCode) {
      console.log("signup error: missing fields");
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const { data: company, error: companyErr } = await admin
      .from("companies")
      .select("id, is_active, code")
      .eq("code", inviteCode)
      .single();

    console.log("company lookup:", { company, companyErr });

    if (companyErr || !company || !company.is_active) {
      console.log("signup error: invalid invite code");
      return NextResponse.json({ error: "invalid invite code" }, { status: 400 });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        company_id: company.id,
      },
    });

    console.log("createUser result:", { data, error });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: data.user.id });
  } catch (e) {
    console.error("signup server error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}