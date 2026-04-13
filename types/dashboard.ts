export type AnnouncementCategory = "admin" | "company";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  company_id: string | null;
  published_at: string;
  is_active: boolean;
  company_name?: string | null;
};

export type ParkingSlotStatus = "empty" | "occupied";

export type ParkingSlot = {
  id: string;
  slot_number: number;
  slot_name: string;
  is_active: boolean;
  current_status: ParkingSlotStatus;
};

export type Reservation = {
  id: string;
  slot_id: string;
  vehicle_id: string | null;
  company_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: string;
};

export type ParkingSlotView = {
  id: string;
  slot_number: number;
  slot_name: string;
  current_status: ParkingSlotStatus;
};