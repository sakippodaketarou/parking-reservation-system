import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DEV_USER_ID = "9c111055-fb64-42dd-a2ea-74926677355d"; // 仮

export async function POST(req: Request) {
  try {
    const { slotId, startAt, endAt, companyId } = await req.json();

    const supabase = supabaseAdmin();

    const { error } = await supabase.from("vehicle_bookings").insert({
      company_id: companyId ?? null,
      slot_id: slotId,
      start_at: startAt,
      end_at: endAt,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}