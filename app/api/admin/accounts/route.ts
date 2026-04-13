import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey);

function hiraToKata(value: string) {
  return value.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function normalizeText(value: string | null | undefined) {
  return hiraToKata((value ?? ""))
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐-‒–—―ー－]/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

function normalizePhone(value: string | null | undefined) {
  return normalizeText(value).replace(/-/g, "");
}

async function getAdminUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "unauthorized", status: 401 as const, user: null };
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return { error: "unauthorized", status: 401 as const, user: null };
  }

  const { data: myProfile, error: profileError } = await admin
    .from("profiles")
    .select("user_id, role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !myProfile) {
    return { error: "profile not found", status: 404 as const, user: null };
  }

  if (myProfile.role !== "admin") {
    return { error: "forbidden", status: 403 as const, user: null };
  }

  return { error: null, status: 200 as const, user };
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await getAdminUserFromRequest(req);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const q = req.nextUrl.searchParams.get("q") ?? "";
    const normalizedQ = normalizeText(q);
    const normalizedPhoneQ = normalizePhone(q);

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select(
        "user_id, company_id, company_name, phone_number, is_active, role, created_at"
      )
      .order("created_at", { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const emailMap = new Map(
      (usersData.users ?? []).map((u) => [u.id, u.email ?? ""])
    );

    const accounts = (profiles ?? []).map((p) => {
      const email = emailMap.get(p.user_id) ?? "";

      return {
        user_id: p.user_id,
        company_id: p.company_id,
        company_name: p.company_name,
        phone_number: p.phone_number,
        is_active: p.is_active,
        role: p.role,
        created_at: p.created_at,
        email,
      };
    });

    const filteredAccounts =
      normalizedQ === "" && normalizedPhoneQ === ""
        ? accounts
        : accounts.filter((account) => {
            const companyIdHit = normalizeText(account.company_id).includes(normalizedQ);
            const userIdHit = normalizeText(account.user_id).includes(normalizedQ);
            const companyNameHit = normalizeText(account.company_name).includes(normalizedQ);
            const emailHit = normalizeText(account.email).includes(normalizedQ);
            const phoneHit = normalizePhone(account.phone_number).includes(normalizedPhoneQ);

            return companyIdHit || userIdHit || companyNameHit || emailHit || phoneHit;
          });

    return NextResponse.json({
      ok: true,
      accounts: filteredAccounts,
      total: filteredAccounts.length,
    });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getAdminUserFromRequest(req);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await req.json();
    const { action, userId, newPassword } = body as {
      action?: string;
      userId?: string;
      newPassword?: string;
    };

    if (action !== "reset_password") {
      return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }

    if (!userId || !newPassword) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    if (newPassword.length < 6 || newPassword.length > 16) {
      return NextResponse.json(
        { error: "パスワードは6文字以上16文字以下で設定してください" },
        { status: 400 }
      );
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "パスワードを再設定しました",
    });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}