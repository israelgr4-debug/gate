export type RuleType = 'always' | 'weekly' | 'date_range' | 'one_time';
export type Decision = 'granted' | 'denied' | 'unrecognized';
export type VehicleType = 'car' | 'truck' | 'other';

export interface Vehicle {
  id: string;
  plate: string;
  plate_display: string | null;
  owner_name: string | null;
  vehicle_type: VehicleType;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessRule {
  id: string;
  vehicle_id: string;
  rule_type: RuleType;
  days_of_week: number[];
  time_from: string | null;
  time_to: string | null;
  valid_from: string | null;
  valid_to: string | null;
  active: boolean;
  created_at: string;
}

export interface AccessEvent {
  id: string;
  device_id: string | null;
  captured_at: string;
  plate_read: string | null;
  plate_display: string | null;
  matched_vehicle_id: string | null;
  decision: Decision;
  reason: string | null;
  confidence: number | null;
  gate_opened: boolean;
  snapshot_path: string | null;
  created_at: string;
}

export interface GateDevice {
  id: string;
  name: string;
  location: string | null;
  relay_ip: string | null;
  relay_port: number;
  relay_unit_id: number;
  relay_channel: number;
  last_seen: string | null;
  active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'viewer';
  created_at: string;
}

export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
