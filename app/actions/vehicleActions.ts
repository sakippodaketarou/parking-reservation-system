"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createVehicle(formData: FormData) {
  const supabase = supabaseAdmin();

  const companyId = getText(formData.get("company_id"));
  const plateNumber = getText(formData.get("plate_number"));

  if (!companyId || !plateNumber) {
    throw new Error("必須項目が足りません");
  }

  const { error } = await supabase.from("vehicles").insert({
    company_id: companyId,
    plate_number: plateNumber,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/vehicles");
  redirect("/vehicles");
}

export async function updateVehicle(id: string, formData: FormData) {
  const supabase = supabaseAdmin();

  const companyId = getText(formData.get("company_id"));
  const plateNumber = getText(formData.get("plate_number"));

  const { error } = await supabase
    .from("vehicles")
    .update({
      company_id: companyId,
      plate_number: plateNumber,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/vehicles");
  redirect("/vehicles");
}

export async function deleteVehicle(id: string) {
  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/vehicles");
  redirect("/vehicles");
}