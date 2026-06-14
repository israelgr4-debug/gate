export type Decision = 'granted' | 'denied' | 'unrecognized';

export type RuleType = 'always' | 'weekly' | 'date_range' | 'one_time';

export interface Vehicle {
  id: string;
  plate: string;
  plate_display: string | null;
  owner_name: string | null;
  vehicle_type: 'car' | 'truck' | 'other';
  active: boolean;
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
}

export interface PlateRead {
  plateRaw: string;
  plateNormalized: string;
  confidence: number;
  imagePath: string;
  capturedAt: string;
  bbox?: { x: number; y: number; w: number; h: number };
}

export interface IPlateRecognizer {
  recognize(frame: Buffer): Promise<PlateRead | null>;
}

export interface AccessEventDraft {
  device_id: string;
  captured_at: string;
  plate_read: string | null;
  plate_display: string | null;
  matched_vehicle_id: string | null;
  decision: Decision;
  reason: string;
  confidence: number | null;
  gate_opened: boolean;
  snapshot_local_path: string | null;
}
