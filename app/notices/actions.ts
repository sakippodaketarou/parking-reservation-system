"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TENANT_POST_ROLES = ["admin", "tenant", "carrier", "contractor"];

type ProfileRow = {
  user_id: string;
  role: string | null;
  company_id: string | null;
};

type NoticeRow = {
  id: string;
  category: "facility" | "tenant";
  title: string;
  body: string;
  file_name: string | null;
  file_path: string | null;
  file_url: string | null;
  published_from: string | null;
  published_until: string | null;
  created_by: string;
  created_by_company_id: string | null;
};

async function getSessionContext() {
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
    .single<ProfileRow>();

  if (profileError || !profile) {
    throw new Error("プロフィール情報を取得できませんでした。");
  }

  return { supabase, user, profile };
}

function normalizeDateTime(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  return new Date(value).toISOString();
}

async function uploadNoticeFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  category: string,
  file: File | null
) {
  if (!file || file.size === 0) {
    return {
      file_name: null as string | null,
      file_path: null as string | null,
      file_url: null as string | null,
    };
  }

  const safeName = file.name.replace(/\s+/g, "_");
  const path = `notices/${category}/${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("notice-files")
    .upload(path, file, { upsert: false });

  if (uploadError) {
    throw new Error(`ファイルアップロードに失敗しました: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("notice-files").getPublicUrl(path);

  return {
    file_name: file.name,
    file_path: path,
    file_url: publicUrl,
  };
}

async function removeNoticeFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null
) {
  if (!filePath) return;
  await supabase.storage.from("notice-files").remove([filePath]);
}

export async function createNotice(formData: FormData) {
  const { supabase, user, profile } = await getSessionContext();

  const category = String(formData.get("category") || "") as "facility" | "tenant";
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const publishedFrom = normalizeDateTime(formData.get("published_from"));
  const publishedUntil = normalizeDateTime(formData.get("published_until"));
  const file = formData.get("file");

  if (!title) throw new Error("タイトルを入力してください。");
  if (!body) throw new Error("本文を入力してください。");
  if (category !== "facility" && category !== "tenant") {
    throw new Error("区分が不正です。");
  }

  if (category === "facility" && profile.role !== "admin") {
    throw new Error("施設側からのお知らせは管理者のみ投稿できます。");
  }

  if (category === "tenant" && !TENANT_POST_ROLES.includes(profile.role ?? "")) {
    throw new Error("この権限では投稿できません。");
  }

  const upload = await uploadNoticeFile(
    supabase,
    user.id,
    category,
    file instanceof File ? file : null
  );

  const { error } = await supabase.from("notices").insert({
    category,
    title,
    body,
    file_name: upload.file_name,
    file_path: upload.file_path,
    file_url: upload.file_url,
    published_from: publishedFrom,
    published_until: publishedUntil,
    created_by: user.id,
    created_by_company_id: profile.company_id,
  });

  if (error) {
    if (upload.file_path) {
      await removeNoticeFile(supabase, upload.file_path);
    }
    throw new Error(`お知らせ作成に失敗しました: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/notices");
  revalidatePath("/notices/archive");
}

export async function updateNotice(formData: FormData) {
  const { supabase, user, profile } = await getSessionContext();

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const publishedFrom = normalizeDateTime(formData.get("published_from"));
  const publishedUntil = normalizeDateTime(formData.get("published_until"));
  const category = String(formData.get("category") || "") as "facility" | "tenant";
  const file = formData.get("file");

  if (!id) throw new Error("対象データが見つかりません。");
  if (!title) throw new Error("タイトルを入力してください。");
  if (!body) throw new Error("本文を入力してください。");

  const { data: notice, error: noticeError } = await supabase
    .from("notices")
    .select(
      "id, category, title, body, file_name, file_path, file_url, published_from, published_until, created_by, created_by_company_id"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single<NoticeRow>();

  if (noticeError || !notice) {
    throw new Error("お知らせが見つかりません。");
  }

  const isAdmin = profile.role === "admin";
  const isOwner = notice.created_by === user.id;

  if (notice.category === "facility" && !isAdmin) {
    throw new Error("施設側のお知らせを編集できるのは管理者のみです。");
  }

  if (notice.category === "tenant" && !(isAdmin || isOwner)) {
    throw new Error("このお知らせを編集する権限がありません。");
  }

  let upload = {
    file_name: notice.file_name,
    file_path: notice.file_path,
    file_url: notice.file_url,
  };

  if (file instanceof File && file.size > 0) {
    const newUpload = await uploadNoticeFile(supabase, user.id, category, file);
    await removeNoticeFile(supabase, notice.file_path);
    upload = newUpload;
  }

  const { error } = await supabase
    .from("notices")
    .update({
      title,
      body,
      file_name: upload.file_name,
      file_path: upload.file_path,
      file_url: upload.file_url,
      published_from: publishedFrom,
      published_until: publishedUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`お知らせ更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/notices");
  revalidatePath("/notices/archive");
}

export async function deleteNotice(formData: FormData) {
  const { supabase, user, profile } = await getSessionContext();
  const id = String(formData.get("id") || "");

  if (!id) throw new Error("対象データが見つかりません。");

  const { data: notice, error: noticeError } = await supabase
    .from("notices")
    .select(
      "id, category, title, body, file_name, file_path, file_url, published_from, published_until, created_by, created_by_company_id"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single<NoticeRow>();

  if (noticeError || !notice) {
    throw new Error("お知らせが見つかりません。");
  }

  const isAdmin = profile.role === "admin";
  const isOwner = notice.created_by === user.id;

  if (notice.category === "facility" && !isAdmin) {
    throw new Error("施設側のお知らせを削除できるのは管理者のみです。");
  }

  if (notice.category === "tenant" && !(isAdmin || isOwner)) {
    throw new Error("このお知らせを削除する権限がありません。");
  }

  const { error } = await supabase
    .from("notices")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`お知らせ削除に失敗しました: ${error.message}`);
  }

  await removeNoticeFile(supabase, notice.file_path);

  revalidatePath("/");
  revalidatePath("/notices");
  revalidatePath("/notices/archive");
}