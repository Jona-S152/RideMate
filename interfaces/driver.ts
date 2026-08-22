export type DriverStatusType = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface DriverProfile {
  id: string;
  user_id: string;
  license_number: string;
  license_expiration_date: string | null;
  license_image_url: string;
  status: DriverStatusType;
  rejection_reason?: string | null;
  terms_accepted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  seats_capacity: number;
  registration_doc_url?: string | null;
  vehicle_image_url?: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BecomeDriverFormData {
  // Step 1: Driver Profile / License
  license_number: string;
  license_expiration_date: string;
  license_image_uri: string;

  // Step 2: Vehicle Information
  brand: string;
  model: string;
  year: string;
  plate: string;
  color: string;
  seats_capacity: number;
  registration_doc_uri: string;
  vehicle_image_uri: string;

  // Step 3: Terms & Confirmation
  terms_accepted: boolean;
}

export interface AddVehicleFormData {
  brand: string;
  model: string;
  year: string;
  plate: string;
  color: string;
  seats_capacity: number;
  registration_doc_uri: string;
  vehicle_image_uri: string;
  set_as_default?: boolean;
}

export interface UpdateDriverProfileData {
  license_number: string;
  license_expiration_date: string;
  license_image_uri?: string;
  vehicle_id?: string;
  brand?: string;
  model?: string;
  year?: string;
  plate?: string;
  color?: string;
  seats_capacity?: number;
  registration_doc_uri?: string;
  vehicle_image_uri?: string;
}

export interface DriverApplicationStatus {
  hasApplied: boolean;
  profile: DriverProfile | null;
  defaultVehicle: Vehicle | null;
  vehicles: Vehicle[];
}
