"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  user_id: string;
  role: string | null;
  company_id: string | null;
};

const ALLOWED_STATUSES = ["empty", "occupied", "mine"] as const;
type ParkingStatus = (typeof ALLOWED_STATUSES)[number];

export async function updateParkingLiveStatus(formData: FormData) {
  const slotCode = String(formData.get("slot_code") || "").trim();
  const nextStatus = String(formData.get("next_status") || "").trim() as ParkingStatus;

  if (!slotCode) {
    throw new Error("車室コードが不正です。");
  }

  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    throw new Error("状態が不正です。");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログイン情報を取得できませんでした。");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, role, company_id")
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile) {
    throw new Error("プロフィール情報を取得できませんでした。");
  }

  if (profile.role !== "admin") {
    throw new Error("この操作は管理者のみ実行できます。");
  }

  const { error } = await supabase.from("parking_live_status").upsert({
    slot_code: slotCode,
    status: nextStatus,
    updated_by: user.id,
    updated_by_company_id: profile.company_id,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`状態更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/");
}