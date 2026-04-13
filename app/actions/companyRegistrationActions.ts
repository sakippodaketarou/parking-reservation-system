"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type RegisterActionState = {
  ok: boolean;
  message: string;
};

function normalizeText(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text.length ? text : null;
}

export async function registerCompanyAction(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  try {
    const admin = supabaseAdmin();

    const companyName = String(formData.get("company_name") || "").trim();
    const companyType = String(formData.get("company_type") || "").trim();
    const userName = String(formData.get("user_name") || "").trim();
    const phoneNumber = String(formData.get("phone_number") || "").trim();
    const contactEmail = String(formData.get("contact_email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    const loginEmail = contactEmail;

    if (!companyName) {
      return { ok: false, message: "会社名を入力してください。" };
    }

    if (!companyType) {
      return { ok: false, message: "会社種別を選択してください。" };
    }

    if (!userName) {
      return { ok: false, message: "担当者名を入力してください。" };
    }

    if (!contactEmail) {
      return { ok: false, message: "連絡先メールを入力してください。" };
    }

    if (!password || password.length < 8) {
      return { ok: false, message: "パスワードは8文字以上で入力してください。" };
    }

    if (!["tenant", "contractor", "delivery", "admin_company"].includes(companyType)) {
      return { ok: false, message: "会社種別が不正です。" };
    }

    const { data: existingCompany, error: existingCompanyError } = await admin
      .from("companies")
      .select("id, name")
      .eq("name", companyName)
      .maybeSingle<{ id: string; name: string | null }>();

    if (existingCompanyError) {
      return {
        ok: false,
        message: `企業情報の確認に失敗しました: ${existingCompanyError.message}`,
      };
    }

    if (existingCompany?.id) {
      return {
        ok: false,
        message:
          "同じ会社名の企業が既に登録されています。別名で登録するか、管理者に確認してください。",
      };
    }

    const { data: newCompany, error: insertCompanyError } = await admin
      .from("companies")
      .insert({
        name: companyName,
        company_type: companyType,
        contact_name: userName,
        contact_email: contactEmail,
        contact_phone: normalizeText(phoneNumber),
      })
      .select("id")
      .single<{ id: string }>();

    if (insertCompanyError || !newCompany?.id) {
      return {
        ok: false,
        message: `企業登録に失敗しました: ${insertCompanyError?.message || "unknown error"}`,
      };
    }

    const companyId = newCompany.id;

    const { data: createdUser, error: createUserError } =
      await admin.auth.admin.createUser({
        email: loginEmail,
        password,
        email_confirm: false,
        user_metadata: {
          company_id: companyId,
          company_name: companyName,
          full_name: userName,
          contact_name: userName,
          contact_email: contactEmail,
          contact_phone: normalizeText(phoneNumber),
          company_type: companyType,
        },
      });

    if (createUserError || !createdUser.user?.id) {
      await admin.from("companies").delete().eq("id", companyId);

      return {
        ok: false,
        message: `ユーザー登録に失敗しました: ${createUserError?.message || "unknown error"}`,
      };
    }

    const newUserId = createdUser.user.id;

    const { error: profileUpsertError } = await admin
      .from("profiles")
      .upsert(
        {
          user_id: newUserId,
          company_id: companyId,
          role: companyType,
          full_name: userName,
          email: loginEmail,
        },
        { onConflict: "user_id" }
      );

    if (profileUpsertError) {
      await admin.auth.admin.deleteUser(newUserId);
      await admin.from("companies").delete().eq("id", companyId);

      return {
        ok: false,
        message: `プロフィール作成に失敗しました: ${profileUpsertError.message}`,
      };
    }

    return {
      ok: true,
      message:
        "企業登録が完了しました。メール確認が必要な設定の場合は受信メールを確認してください。",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "登録処理中にエラーが発生しました。",
    };
  }
}