export type ComplianceStatus = 'valid' | 'expiring_soon' | 'overstayed' | 'resolved';

export interface Traveler {
  id: string;
  passport_number: string;
  full_name: string;
  nationality: string;
  entry_port: string;
  evisa_number: string;
  esim_id: string;
  phone_number: string;
  email: string;
  visa_issue_date: string;
  visa_expiry_date: string;
  status: ComplianceStatus;
  overstay_days: number;
  fine_amount: number;
  is_flagged: number; // 0 or 1
  resolution_notes?: string;
  last_latitude: number;
  last_longitude: number;
  created_at: string;
  last_evaluated_at: string;
}

export type AlertStage = 'T-10' | 'T-3' | 'T-0' | 'DAILY_OVERSTAY' | 'MANUAL_OFFICER';

export interface Alert {
  id: string;
  traveler_id: string;
  traveler_name: string;
  passport_number: string;
  stage: AlertStage;
  recipient_phone: string;
  recipient_email: string;
  message: string;
  channel: 'SMS' | 'EMAIL' | 'ESIM_PUSH' | 'OFFICER_DISPATCH';
  sent_at: string;
  status: 'DELIVERED' | 'DISPATCHED';
}

export type ExtensionStatus = 'pending' | 'approved' | 'rejected';

export interface VisaExtension {
  id: string;
  traveler_id: string;
  passport_number: string;
  full_name: string;
  requested_days: number;
  reason: string;
  document_url: string;
  status: ExtensionStatus;
  officer_remarks?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface OfficerUser {
  id: string;
  username: string;
  full_name: string;
  badge_number: string;
  role: string;
  token?: string;
}

export interface GateScanResponse {
  gate_id: string;
  passport_number: string;
  full_name: string;
  status: string;
  overstay_days: number;
  fine: number;
  message: string;
  gate_action: 'GRANTED' | 'DENIED';
  audio_voice_alert: string;
}

export interface GateScanLog {
  id: string;
  gate_identifier: string;
  traveler_id: string;
  passport_number: string;
  full_name: string;
  scanned_status: string;
  overstay_days: number;
  fine_assessed: number;
  action_taken: 'GRANTED' | 'DENIED';
  message: string;
  scanned_at: string;
}

export interface ComplianceStats {
  total_monitored: number;
  compliant: number;
  expiring_soon: number;
  active_overstayers: number;
  resolved: number;
  total_accrued_fines: number;
  pending_extensions: number;
  recent_alerts_count: number;
  last_engine_run: string;
}

export interface EngineRunResult {
  timestamp: string;
  total_evaluated: number;
  valid_count: number;
  expiring_soon_count: number;
  overstayed_count: number;
  resolved_count: number;
  new_alerts_triggered: number;
  total_accrued_fines: number;
  logs: string[];
}

export interface LiveMobileMessage {
  id: string;
  timestamp: string;
  sender: string; // e.g. "GOV-PRAVAS" or "MHA-VISA"
  recipient_phone: string;
  traveler_name: string;
  passport_number: string;
  message: string;
  channel: 'SMS' | 'WHATSAPP' | 'ESIM_PUSH' | 'BROWSER_NOTIFICATION';
  stage: AlertStage | 'CUSTOM_TEST' | 'GATE_EVENT';
  status: 'DELIVERED' | 'READ' | 'PENDING';
  carrier?: string; // "Jio 5G" | "Airtel 5G" | "Vi 5G"
}
