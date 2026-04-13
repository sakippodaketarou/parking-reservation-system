import { redirect } from "next/navigation";

export default function ReservationsRedirectPage() {
  redirect("/vehicle-bookings");
}