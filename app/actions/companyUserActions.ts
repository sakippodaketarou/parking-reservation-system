"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

export type AddCompanyUserState = {
  ok: boolean;
  message: string;
};

export const addCompanyUserInitialState: AddCompanyUserState = {
  ok: false,
  message: "",
};

type ProfileRow = {
  user_id: string;
  company_id: string;
  is_active: boolean;
  role: string;
};

async function getCurrentProfile() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログイン情報が確認できません。");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, company_id, is_active, role")
    .eq("user_id", user.id)
    .single<ProfileRow>();

  if (error || !profile) {
    throw new Error(`プロフィール取得に失敗しました: ${error?.message ?? "not found"}`);
  }

  if (!profile.is_active) {
    throw new Error("このアカウントは現在利用できません。");
  }

  return profile;
}

export async function addCompanyUserAction(
  _prevState: AddCompanyUserState,
  formData: FormData
): Promise<AddCompanyUserState> {
  try {
    const profile = await getCurrentProfile();

    const userName = String(formData.get("user_name") ?? "").trim();
    const phoneNumber = String(formData.get("phone_number") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!userName || !phoneNumber || !email || !password) {
      return {
        ok: false,
        message: "必須項目をすべて入力してください。",
      };
    }

    const normalizedPhoneNumber = phoneNumber.replace(/-/g, "");

    if (!/^\d{10,11}$/.test(normalizedPhoneNumber)) {
      return {
        ok: false,
        message: "電話番号は10桁または11桁で入力してください。",
      };
    }

    if (password.length < 6 || password.length > 16) {
      return {
        ok: false,
        message: "パスワードは6文字以上16文字以下で設定してください。",
      };
    }

    const admin = supabaseAdmin();

    const { data: authResult, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: userName,
      },
    });

    if (authError || !authResult.user) {
      return {
        ok: false,
        message: `ユーザー作成に失敗しました: ${authError?.message ?? "unknown error"}`,
      };
    }

    const userId = authResult.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: userId,
      company_id: profile.company_id,
      role: "user",
      is_active: true,
      company_name: null,
      phone_number: normalizedPhoneNumber,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);

      return {
        ok: false,
        message: `プロフィール作成に失敗しました: ${profileError.message}`,
      };
    }

    return {
      ok: true,
      message: "同じ会社の一般ユーザーを追加しました。",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "ユーザー追加に失敗しました。",
    };
  }
}