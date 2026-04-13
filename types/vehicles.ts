export type Vehicle = {
  id: string;
  company_id: string;
  plate_region: string;
  plate_class: string;
  plate_kana: string;
  plate_number: string;
  vehicle_type: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type VehicleListItem = Vehicle & {
  company_name?: string | null;
};

export type VehicleFormValues = {
  id?: string;
  plate_region?: string;
  plate_class?: string;
  plate_kana?: string;
  plate_number?: string;
  vehicle_type?: string;
  note?: string;
  is_active?: boolean;
};