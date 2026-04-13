export type BookingVehicle = {
  id: string;
  company_id: string;
  plate_region: string;
  plate_class: string;
  plate_kana: string;
  plate_number: string;
  vehicle_type: string | null;
  is_active: boolean;
};

export type BookingSlot = {
  id: string;
  slot_name: string;
  slot_number: number;
};

export type VehicleBookingItem = {
  id: string;
  company_id: string;
  slot_id: string;
  vehicle_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

export type ProfileRole = "admin" | "user";