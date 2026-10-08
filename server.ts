import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

export interface TravelerRecord {
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
  status: 'valid' | 'expiring_soon' | 'overstayed' | 'resolved';
  overstay_days: number;
  fine_amount: number;
  is_flagged: number;
  resolution_notes?: string;
  last_latitude: number;
  last_longitude: number;
  created_at: string;
  last_evaluated_at: string;
}

export interface AlertRecord {
  id: string;
  traveler_id: string;
  traveler_name: string;
  passport_number: string;
  stage: 'T-10' | 'T-3' | 'T-0' | 'DAILY_OVERSTAY' | 'MANUAL_OFFICER';
  recipient_phone: string;
  recipient_email: string;
  message: string;
  channel: 'SMS' | 'EMAIL' | 'ESIM_PUSH' | 'OFFICER_DISPATCH';
  sent_at: string;
  status: 'DELIVERED' | 'DISPATCHED';
}

export interface VisaExtensionRecord {
  id: string;
  traveler_id: string;
  passport_number: string;
  full_name: string;
  requested_days: number;
  reason: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  officer_remarks?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface GateScanLogRecord {
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

// Global Server-Sent Events client pool for real-time mobile push notifications
const sseClients: express.Response[] = [];

export function broadcastLiveEvent(eventType: string, payload: any) {
  const data = JSON.stringify(payload);
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(`event: ${eventType}\ndata: ${data}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// In-memory persistent database store
class ImmigrationDatabase {
  travelers: Map<string, TravelerRecord> = new Map();
  alerts: AlertRecord[] = [];
  extensions: Map<string, VisaExtensionRecord> = new Map();
  gateLogs: GateScanLogRecord[] = [];
  finePerDay: number = 2000; // ₹2,000/day
  lastEngineRun: string = new Date().toISOString();
  systemDateOffsetDays: number = 0; // Allows live time-travel simulation in demo

  constructor() {
    this.seedDatabase();
  }

  getCurrentSystemDate(): Date {
    const now = new Date();
    if (this.systemDateOffsetDays !== 0) {
      now.setDate(now.getDate() + this.systemDateOffsetDays);
    }
    return now;
  }

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  addDays(baseDate: Date, days: number): string {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return this.formatDate(d);
  }

  seedDatabase() {
    this.travelers.clear();
    this.alerts = [];
    this.extensions.clear();
    this.gateLogs = [];

    const today = this.getCurrentSystemDate();

    // 1. Valid Visa (28 days remaining)
    const t1: TravelerRecord = {
      id: 'TRV-2026-001',
      passport_number: 'GB7718290',
      full_name: 'Sarah Jenkins',
      nationality: 'United Kingdom',
      entry_port: 'DEL - Indira Gandhi Intl, New Delhi',
      evisa_number: 'IND-EV-982741',
      esim_id: 'ESIM-AIRTEL-9901',
      phone_number: '+91 98112 34501',
      email: 'sarah.jenkins@uktravel.co.uk',
      visa_issue_date: this.addDays(today, -32),
      visa_expiry_date: this.addDays(today, 28),
      status: 'valid',
      overstay_days: 0,
      fine_amount: 0,
      is_flagged: 0,
      last_latitude: 28.5562,
      last_longitude: 77.1000, // Near Delhi Airport
      created_at: new Date(Date.now() - 32 * 86400000).toISOString(),
      last_evaluated_at: new Date().toISOString(),
    };

    // 2. Expiring in 10 days (T-10 stage alert triggered)
    const t2: TravelerRecord = {
      id: 'TRV-2026-002',
      passport_number: 'JP8829102',
      full_name: 'Kenji Takahashi',
      nationality: 'Japan',
      entry_port: 'BOM - Chhatrapati Shivaji, Mumbai',
      evisa_number: 'IND-EV-661209',
      esim_id: 'ESIM-JIO-4412',
      phone_number: '+91 98201 55420',
      email: 'kenji.takahashi@tokyomail.jp',
      visa_issue_date: this.addDays(today, -50),
      visa_expiry_date: this.addDays(today, 10),
      status: 'expiring_soon',
      overstay_days: 0,
      fine_amount: 0,
      is_flagged: 0,
      last_latitude: 19.0896,
      last_longitude: 72.8656,
      created_at: new Date(Date.now() - 50 * 86400000).toISOString(),
      last_evaluated_at: new Date().toISOString(),
    };

    // 3. Expiring in 3 days (T-3 urgent alert triggered)
    const t3: TravelerRecord = {
      id: 'TRV-2026-003',
      passport_number: 'FR5510923',
      full_name: 'Elena Rostova',
      nationality: 'France',
      entry_port: 'BLR - Kempegowda Intl, Bengaluru',
      evisa_number: 'IND-EV-773104',
      esim_id: 'ESIM-VI-8821',
      phone_number: '+91 98450 11982',
      email: 'elena.rostova@parisweb.fr',
      visa_issue_date: this.addDays(today, -57),
      visa_expiry_date: this.addDays(today, 3),
      status: 'expiring_soon',
      overstay_days: 0,
      fine_amount: 0,
      is_flagged: 0,
      last_latitude: 12.9716,
      last_longitude: 77.5946,
      created_at: new Date(Date.now() - 57 * 86400000).toISOString(),
      last_evaluated_at: new Date().toISOString(),
    };

    // 4. Expiring Today (T-0 final notice)
    const t4: TravelerRecord = {
      id: 'TRV-2026-004',
      passport_number: 'ES9018241',
      full_name: 'Carlos Mendez',
      nationality: 'Spain',
      entry_port: 'DEL - Indira Gandhi Intl, New Delhi',
      evisa_number: 'IND-EV-331908',
      esim_id: 'ESIM-AIRTEL-1102',
      phone_number: '+91 98110 88219',
      email: 'carlos.mendez@madridtour.es',
      visa_issue_date: this.addDays(today, -60),
      visa_expiry_date: this.formatDate(today),
      status: 'expiring_soon',
      overstay_days: 0,
      fine_amount: 0,
      is_flagged: 0,
      last_latitude: 28.6139,
      last_longitude: 77.2090,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      last_evaluated_at: new Date().toISOString(),
    };

    // 5. Overstayed 4 days (₹8,000 fine, flagged status)
    const t5: TravelerRecord = {
      id: 'TRV-2026-005',
      passport_number: 'AU3391055',
      full_name: 'Liam Hemsworth-Miller',
      nationality: 'Australia',
      entry_port: 'DEL - Indira Gandhi Intl, New Delhi',
      evisa_number: 'IND-EV-554190',
      esim_id: 'ESIM-AIRTEL-9905',
      phone_number: '+91 98100 44211',
      email: 'liam.miller@sydneymail.au',
      visa_issue_date: this.addDays(today, -64),
      visa_expiry_date: this.addDays(today, -4),
      status: 'overstayed',
      overstay_days: 4,
      fine_amount: 8000,
      is_flagged: 1,
      last_latitude: 28.5355,
      last_longitude: 77.3910, // In Noida, outside airport
      created_at: new Date(Date.now() - 64 * 86400000).toISOString(),
      last_evaluated_at: new Date().toISOString(),
    };

    // 6. Overstayed 12 days (₹24,000 fine, high-priority interception)
    const t6: TravelerRecord = {
      id: 'TRV-2026-006',
      passport_number: 'DE4491022',
      full_name: 'Dimitri Volkov',
      nationality: 'Germany',
      entry_port: 'GOI - Goa Dabolim Intl',
      evisa_number: 'IND-EV-119283',
      esim_id: 'ESIM-JIO-7711',
      phone_number: '+91 98221 99044',
      email: 'd.volkov@berlintech.de',
      visa_issue_date: this.addDays(today, -72),
      visa_expiry_date: this.addDays(today, -12),
      status: 'overstayed',
      overstay_days: 12,
      fine_amount: 24000,
      is_flagged: 1,
      last_latitude: 15.2993,
      last_longitude: 74.1240,
      created_at: new Date(Date.now() - 72 * 86400000).toISOString(),
      last_evaluated_at: new Date().toISOString(),
    };

    // 7. Resolved case with payment notes recorded
    const t7: TravelerRecord = {
      id: 'TRV-2026-007',
      passport_number: 'BR1198234',
      full_name: 'Maria Santos',
      nationality: 'Brazil',
      entry_port: 'MAA - Chennai Intl',
      evisa_number: 'IND-EV-882736',
      esim_id: 'ESIM-VI-3341',
      phone_number: '+91 98401 33290',
      email: 'maria.santos@riomail.br',
      visa_issue_date: this.addDays(today, -63),
      visa_expiry_date: this.addDays(today, -3),
      status: 'resolved',
      overstay_days: 3,
      fine_amount: 6000,
      is_flagged: 0,
      resolution_notes: 'Fine ₹6,000 settled at Counter 2 (Receipt #FRRO-DEL-8921). Cleared for departure by Officer Sharma (Badge #FRRO-902).',
      last_latitude: 12.9941,
      last_longitude: 80.1709,
      created_at: new Date(Date.now() - 63 * 86400000).toISOString(),
      last_evaluated_at: new Date().toISOString(),
    };

    // 8. Tourist with Pending Visa Extension Request
    const t8: TravelerRecord = {
      id: 'TRV-2026-008',
      passport_number: 'CA6629104',
      full_name: 'David Zhang',
      nationality: 'Canada',
      entry_port: 'DEL - Indira Gandhi Intl, New Delhi',
      evisa_number: 'IND-EV-440192',
      esim_id: 'ESIM-AIRTEL-3319',
      phone_number: '+91 98119 77201',
      email: 'david.zhang@torontomail.ca',
      visa_issue_date: this.addDays(today, -58),
      visa_expiry_date: this.addDays(today, 2),
      status: 'expiring_soon',
      overstay_days: 0,
      fine_amount: 0,
      is_flagged: 0,
      last_latitude: 28.6328,
      last_longitude: 77.2197,
      created_at: new Date(Date.now() - 58 * 86400000).toISOString(),
      last_evaluated_at: new Date().toISOString(),
    };

    [t1, t2, t3, t4, t5, t6, t7, t8].forEach(t => this.travelers.set(t.id, t));

    // Seed alerts with authentic Indian Bureau of Immigration (e-Pravas Suraksha) branding
    this.alerts = [
      {
        id: 'ALT-1001',
        traveler_id: t2.id,
        traveler_name: t2.full_name,
        passport_number: t2.passport_number,
        stage: 'T-10',
        recipient_phone: t2.phone_number,
        recipient_email: t2.email,
        message: `[e-Pravas Suraksha: Bureau of Immigration] Dear ${t2.full_name}, your Indian e-Visa (${t2.evisa_number}) expires in 10 days on ${t2.visa_expiry_date}. Please schedule departure or submit an online extension at pravas.gov.in.`,
        channel: 'SMS',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        status: 'DELIVERED',
      },
      {
        id: 'ALT-1002',
        traveler_id: t3.id,
        traveler_name: t3.full_name,
        passport_number: t3.passport_number,
        stage: 'T-3',
        recipient_phone: t3.phone_number,
        recipient_email: t3.email,
        message: `[URGENT: e-Pravas Compliance Alert] Dear ${t3.full_name}, your visa expires in 3 days on ${t3.visa_expiry_date}. Overstaying incurs statutory fine of INR 2,000/day and automated Pravas E-Dwar departure blocking.`,
        channel: 'ESIM_PUSH',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        status: 'DELIVERED',
      },
      {
        id: 'ALT-1003',
        traveler_id: t4.id,
        traveler_name: t4.full_name,
        passport_number: t4.passport_number,
        stage: 'T-0',
        recipient_phone: t4.phone_number,
        recipient_email: t4.email,
        message: `[FINAL NOTICE: e-Pravas Border Control] Dear ${t4.full_name}, today (${t4.visa_expiry_date}) is your last authorized day in India. Compliance window closes at 23:59 IST tonight. Proceed to airport immediately.`,
        channel: 'SMS',
        sent_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: 'DELIVERED',
      },
      {
        id: 'ALT-1004',
        traveler_id: t5.id,
        traveler_name: t5.full_name,
        passport_number: t5.passport_number,
        stage: 'DAILY_OVERSTAY',
        recipient_phone: t5.phone_number,
        recipient_email: t5.email,
        message: `[CRITICAL WARNING: e-Pravas Bureau of Immigration] Passenger ${t5.full_name}, you have overstayed by 4 days. Current accrued penalty fine: INR 8,000. Your passport (${t5.passport_number}) is flagged for airport interception. Report to nearest FRRO office immediately.`,
        channel: 'OFFICER_DISPATCH',
        sent_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        status: 'DELIVERED',
      },
    ];

    // Seed Extension Request
    const ext1: VisaExtensionRecord = {
      id: 'EXT-2026-001',
      traveler_id: t8.id,
      passport_number: t8.passport_number,
      full_name: t8.full_name,
      requested_days: 14,
      reason: 'Medical treatment follow-up at Max Healthcare Saket, New Delhi. Hospital discharge summary attached.',
      document_url: 'https://e-frro.gov.in/docs/medical-cert-8921.pdf',
      status: 'pending',
      submitted_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    };
    this.extensions.set(ext1.id, ext1);

    // Seed Gate Logs
    this.gateLogs = [
      {
        id: 'GLOG-5001',
        gate_identifier: 'EGATE_DEL_T3_04',
        traveler_id: t1.id,
        passport_number: t1.passport_number,
        full_name: t1.full_name,
        scanned_status: 'valid',
        overstay_days: 0,
        fine_assessed: 0,
        action_taken: 'GRANTED',
        message: 'COMPLIANCE VERIFIED: Valid e-Visa (28 days remaining). Departure authorized.',
        scanned_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
      {
        id: 'GLOG-5002',
        gate_identifier: 'EGATE_DEL_T3_04',
        traveler_id: t5.id,
        passport_number: t5.passport_number,
        full_name: t5.full_name,
        scanned_status: 'overstayed',
        overstay_days: 4,
        fine_assessed: 8000,
        action_taken: 'DENIED',
        message: 'OVERSTAY DETECTED! Fine Pending: INR 8,000. Turn to Counter 4.',
        scanned_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
    ];
  }

  evaluateComplianceEngine(): {
    evaluated: number;
    validCount: number;
    expiringSoonCount: number;
    overstayedCount: number;
    resolvedCount: number;
    newAlerts: AlertRecord[];
    totalFines: number;
    logs: string[];
  } {
    const today = this.getCurrentSystemDate();
    const todayStr = this.formatDate(today);
    const newAlerts: AlertRecord[] = [];
    const logs: string[] = [];

    let validCount = 0;
    let expiringSoonCount = 0;
    let overstayedCount = 0;
    let resolvedCount = 0;
    let totalFines = 0;

    logs.push(`[${new Date().toISOString()}] Cloud Engine Evaluation triggered at IST reference date: ${todayStr}`);

    for (const traveler of this.travelers.values()) {
      if (traveler.status === 'resolved') {
        resolvedCount++;
        totalFines += traveler.fine_amount;
        continue;
      }

      // Calculate days difference
      const expiryDate = new Date(traveler.visa_expiry_date + 'T23:59:59');
      const todayZero = new Date(todayStr + 'T00:00:00');
      const diffMs = todayZero.getTime() - new Date(traveler.visa_expiry_date + 'T00:00:00').getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Overstay days: if diffDays > 0, overstayed by that many days
      let overstayDays = 0;
      let remainingDays = 0;

      if (diffDays > 0) {
        overstayDays = diffDays;
        traveler.status = 'overstayed';
        traveler.overstay_days = overstayDays;
        traveler.fine_amount = overstayDays * this.finePerDay;
        traveler.is_flagged = 1;
        overstayedCount++;
        totalFines += traveler.fine_amount;

        logs.push(`OVERSTAY DETECTED: ${traveler.full_name} (${traveler.passport_number}) -> ${overstayDays} days overstay. Fine: ₹${traveler.fine_amount.toLocaleString('en-IN')}`);

        // Check if daily overstay alert needed
        const existingDailyAlert = this.alerts.find(
          a => a.traveler_id === traveler.id && a.stage === 'DAILY_OVERSTAY' && a.sent_at.startsWith(todayStr)
        );

        if (!existingDailyAlert) {
          const alert: AlertRecord = {
            id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            traveler_id: traveler.id,
            traveler_name: traveler.full_name,
            passport_number: traveler.passport_number,
            stage: 'DAILY_OVERSTAY',
            recipient_phone: traveler.phone_number,
            recipient_email: traveler.email,
            message: `[CRITICAL WARNING: e-Pravas Bureau of Immigration] Passenger ${traveler.full_name}, you have overstayed by ${overstayDays} days. Current accrued penalty fine: INR ${traveler.fine_amount.toLocaleString('en-IN')}. Your passport (${traveler.passport_number}) is flagged for airport interception. Report to nearest FRRO office immediately.`,
            channel: 'OFFICER_DISPATCH',
            sent_at: new Date().toISOString(),
            status: 'DELIVERED',
          };
          this.alerts.unshift(alert);
          newAlerts.push(alert);
          broadcastLiveEvent('mobile_alert', {
            id: alert.id,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender: 'GOV-PRAVAS',
            recipient_phone: alert.recipient_phone,
            traveler_name: alert.traveler_name,
            passport_number: alert.passport_number,
            message: alert.message,
            channel: alert.channel,
            stage: alert.stage,
            carrier: 'Jio 5G',
            status: 'DELIVERED',
          });
        }
      } else {
        remainingDays = Math.abs(diffDays);
        traveler.overstay_days = 0;
        traveler.fine_amount = 0;
        traveler.is_flagged = 0;

        if (remainingDays <= 5) {
          traveler.status = 'expiring_soon';
          expiringSoonCount++;
        } else {
          traveler.status = 'valid';
          validCount++;
        }

        // Check milestones
        if (remainingDays === 10) {
          const existing = this.alerts.find(a => a.traveler_id === traveler.id && a.stage === 'T-10');
          if (!existing) {
            const alert: AlertRecord = {
              id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              traveler_id: traveler.id,
              traveler_name: traveler.full_name,
              passport_number: traveler.passport_number,
              stage: 'T-10',
              recipient_phone: traveler.phone_number,
              recipient_email: traveler.email,
              message: `[e-Pravas Suraksha: Bureau of Immigration] Dear ${traveler.full_name}, your Indian e-Visa (${traveler.evisa_number}) expires in 10 days on ${traveler.visa_expiry_date}. Please schedule departure or apply for an online extension at pravas.gov.in.`,
              channel: 'SMS',
              sent_at: new Date().toISOString(),
              status: 'DELIVERED',
            };
            this.alerts.unshift(alert);
            newAlerts.push(alert);
            logs.push(`Dispatched T-10 Gentle Reminder to ${traveler.full_name}`);
            broadcastLiveEvent('mobile_alert', {
              id: alert.id,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              sender: 'GOV-PRAVAS',
              recipient_phone: alert.recipient_phone,
              traveler_name: alert.traveler_name,
              passport_number: alert.passport_number,
              message: alert.message,
              channel: alert.channel,
              stage: alert.stage,
              carrier: 'Jio 5G',
              status: 'DELIVERED',
            });
          }
        } else if (remainingDays === 3) {
          const existing = this.alerts.find(a => a.traveler_id === traveler.id && a.stage === 'T-3');
          if (!existing) {
            const alert: AlertRecord = {
              id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              traveler_id: traveler.id,
              traveler_name: traveler.full_name,
              passport_number: traveler.passport_number,
              stage: 'T-3',
              recipient_phone: traveler.phone_number,
              recipient_email: traveler.email,
              message: `[URGENT: e-Pravas Compliance Alert] Dear ${traveler.full_name}, your visa expires in 3 days on ${traveler.visa_expiry_date}. Overstaying incurs statutory fine of INR 2,000/day and automated Pravas E-Dwar departure blocking.`,
              channel: 'ESIM_PUSH',
              sent_at: new Date().toISOString(),
              status: 'DELIVERED',
            };
            this.alerts.unshift(alert);
            newAlerts.push(alert);
            logs.push(`Dispatched T-3 Urgent Notice to ${traveler.full_name}`);
            broadcastLiveEvent('mobile_alert', {
              id: alert.id,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              sender: 'GOV-PRAVAS',
              recipient_phone: alert.recipient_phone,
              traveler_name: alert.traveler_name,
              passport_number: alert.passport_number,
              message: alert.message,
              channel: alert.channel,
              stage: alert.stage,
              carrier: 'Airtel 5G',
              status: 'DELIVERED',
            });
          }
        } else if (remainingDays === 0) {
          const existing = this.alerts.find(a => a.traveler_id === traveler.id && a.stage === 'T-0');
          if (!existing) {
            const alert: AlertRecord = {
              id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              traveler_id: traveler.id,
              traveler_name: traveler.full_name,
              passport_number: traveler.passport_number,
              stage: 'T-0',
              recipient_phone: traveler.phone_number,
              recipient_email: traveler.email,
              message: `[FINAL NOTICE: e-Pravas Border Control] Dear ${traveler.full_name}, today (${traveler.visa_expiry_date}) is your last authorized day in India. Compliance window closes at 23:59 IST tonight. Proceed to airport immediately.`,
              channel: 'SMS',
              sent_at: new Date().toISOString(),
              status: 'DELIVERED',
            };
            this.alerts.unshift(alert);
            newAlerts.push(alert);
            logs.push(`Dispatched T-0 Expiry Notice to ${traveler.full_name}`);
            broadcastLiveEvent('mobile_alert', {
              id: alert.id,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              sender: 'GOV-PRAVAS',
              recipient_phone: alert.recipient_phone,
              traveler_name: alert.traveler_name,
              passport_number: alert.passport_number,
              message: alert.message,
              channel: alert.channel,
              stage: alert.stage,
              carrier: 'Jio 5G',
              status: 'DELIVERED',
            });
          }
        }
      }

      traveler.last_evaluated_at = new Date().toISOString();
    }

    this.lastEngineRun = new Date().toISOString();
    logs.push(`Compliance evaluation complete. Monitored: ${this.travelers.size}, Valid: ${validCount}, Expiring: ${expiringSoonCount}, Overstayed: ${overstayedCount}, Resolved: ${resolvedCount}.`);

    return {
      evaluated: this.travelers.size,
      validCount,
      expiringSoonCount,
      overstayedCount,
      resolvedCount,
      newAlerts,
      totalFines,
      logs,
    };
  }

  getStats() {
    let compliant = 0;
    let expiring_soon = 0;
    let active_overstayers = 0;
    let resolved = 0;
    let total_accrued_fines = 0;

    for (const t of this.travelers.values()) {
      if (t.status === 'resolved') {
        resolved++;
        total_accrued_fines += t.fine_amount;
      } else if (t.status === 'overstayed') {
        active_overstayers++;
        total_accrued_fines += t.fine_amount;
      } else if (t.status === 'expiring_soon') {
        expiring_soon++;
      } else {
        compliant++;
      }
    }

    let pending_extensions = 0;
    for (const ext of this.extensions.values()) {
      if (ext.status === 'pending') pending_extensions++;
    }

    return {
      total_monitored: this.travelers.size,
      compliant,
      expiring_soon,
      active_overstayers,
      resolved,
      total_accrued_fines,
      pending_extensions,
      recent_alerts_count: this.alerts.length,
      last_engine_run: this.lastEngineRun,
    };
  }
}

const db = new ImmigrationDatabase();

// Background Compliance Scheduler (runs every 2 minutes)
setInterval(() => {
  try {
    db.evaluateComplianceEngine();
  } catch (err) {
    console.error('Error in background compliance evaluation:', err);
  }
}, 2 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ----------------------------------------------------
  // Real-Time Server-Sent Events (SSE) Live Stream
  // ----------------------------------------------------
  app.get('/api/live-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.push(res);

    // Initial handshake ping
    res.write(`event: connected\ndata: ${JSON.stringify({
      system: 'e-Pravas Suraksha Live Stream',
      status: 'ONLINE',
      timestamp: new Date().toISOString(),
      activeClients: sseClients.length,
    })}\n\n`);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // Direct Live Mobile SMS & Push Notification Dispatch Endpoint
  app.post('/api/mobile/notify', async (req, res) => {
    const {
      recipient_phone,
      message,
      traveler_name,
      passport_number,
      stage,
      channel,
      custom_sender,
      twilio_account_sid,
      twilio_auth_token,
      twilio_from_number,
      sms_gateway_webhook_url,
    } = req.body;

    const phone = (recipient_phone || '+91 98112 34501').trim();
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanDigits.startsWith('91')
      ? cleanDigits
      : cleanDigits.length === 10
      ? '91' + cleanDigits
      : cleanDigits;

    const alertId = `ALT-MOB-${Date.now()}`;
    const now = new Date().toISOString();

    const alertRecord: AlertRecord = {
      id: alertId,
      traveler_id: 'MOB-USER',
      traveler_name: traveler_name || 'Kenji Takahashi',
      passport_number: passport_number || 'JP8829102',
      stage: stage || 'MANUAL_OFFICER',
      recipient_phone: phone,
      recipient_email: 'passenger@pravas.gov.in',
      message: message || `[e-Pravas Suraksha: Bureau of Immigration] Live compliance notice delivered to ${phone}. Verified by Govt. of India.`,
      channel: (channel as any) || 'SMS',
      sent_at: now,
      status: 'DELIVERED',
    };

    db.alerts.unshift(alertRecord);

    const carriers = ['Jio 5G', 'Airtel 5G', 'Vi 5G'];
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];

    const livePayload = {
      id: alertId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: custom_sender || 'GOV-PRAVAS',
      recipient_phone: phone,
      traveler_name: alertRecord.traveler_name,
      passport_number: alertRecord.passport_number,
      message: alertRecord.message,
      channel: alertRecord.channel,
      stage: alertRecord.stage,
      carrier,
      status: 'DELIVERED' as const,
    };

    broadcastLiveEvent('mobile_alert', livePayload);

    // Real-world external gateway dispatch (Twilio cellular SMS API)
    let twilioResult: any = null;
    const twilioSid = twilio_account_sid || process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = twilio_auth_token || process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = twilio_from_number || process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioAuth && twilioFrom) {
      try {
        const toE164 = phone.startsWith('+') ? phone : `+${formattedPhone}`;
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: toE164,
              From: twilioFrom,
              Body: alertRecord.message,
            }).toString(),
          }
        );
        const twilioData = await twilioRes.json();
        twilioResult = {
          success: twilioRes.ok,
          status: twilioRes.ok ? 'QUEUED_OR_SENT' : 'ERROR',
          message_sid: twilioData.sid,
          error_message: twilioData.message,
        };
      } catch (err: any) {
        twilioResult = { success: false, status: 'FAILED', error_message: err.message };
      }
    }

    // Real-world external webhook dispatch (e.g. Fast2SMS / MSG91 / custom cellular webhook)
    let webhookResult: any = null;
    if (sms_gateway_webhook_url) {
      try {
        const whRes = await fetch(sms_gateway_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            formatted_to: `+${formattedPhone}`,
            message: alertRecord.message,
            sender: custom_sender || 'GOV-PRAVAS',
            timestamp: now,
          }),
        });
        webhookResult = {
          success: whRes.ok,
          http_status: whRes.status,
          status: whRes.ok ? 'DELIVERED_TO_GATEWAY' : 'WEBHOOK_ERROR',
        };
      } catch (err: any) {
        webhookResult = { success: false, status: 'WEBHOOK_FAILED', error: err.message };
      }
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(alertRecord.message)}`;
    const smsUriAndroid = `sms:+${formattedPhone}?body=${encodeURIComponent(alertRecord.message)}`;
    const smsUriIos = `sms:+${formattedPhone}&body=${encodeURIComponent(alertRecord.message)}`;

    res.json({
      success: true,
      alert: livePayload,
      real_world_delivery: {
        phone_target: phone,
        formatted_phone: `+${formattedPhone}`,
        whatsapp_url: whatsappUrl,
        sms_uri_android: smsUriAndroid,
        sms_uri_ios: smsUriIos,
        twilio_result: twilioResult,
        webhook_result: webhookResult,
      },
      carrier_dlr: {
        gateway: carrier,
        message_id: `MSG-JIO-${Date.now()}`,
        delivery_status: 'DELIVRD',
        smpp_code: 'ESME_ROK',
        timestamp: now,
      },
    });
  });

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // Auth endpoint for Officers
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'officer1' && password === 'admin123') {
      res.json({
        success: true,
        token: 'jwt_mock_token_officer1_' + Date.now(),
        user: {
          id: 'OFFICER-001',
          username: 'officer1',
          full_name: 'Rajesh Sharma',
          badge_number: 'BOI-DEL-902',
          role: 'Senior Bureau of Immigration Officer',
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials. Use officer1 / admin123' });
    }
  });

  // KPI Stats
  app.get('/api/compliance/stats', (req, res) => {
    res.json(db.getStats());
  });

  // Force Run Compliance Engine
  app.post('/api/compliance/force-run', (req, res) => {
    const result = db.evaluateComplianceEngine();
    res.json({
      success: true,
      result,
      stats: db.getStats(),
    });
  });

  // Set system simulated date offset (for time-travel demo)
  app.post('/api/compliance/time-travel', (req, res) => {
    const { offsetDays } = req.body;
    db.systemDateOffsetDays = Number(offsetDays) || 0;
    const result = db.evaluateComplianceEngine();
    res.json({
      success: true,
      currentSimulatedDate: db.formatDate(db.getCurrentSystemDate()),
      offsetDays: db.systemDateOffsetDays,
      result,
      stats: db.getStats(),
    });
  });

  // Travelers List & Filter
  app.get('/api/travelers', (req, res) => {
    const { status, query, flagged } = req.query;
    let list = Array.from(db.travelers.values());

    if (status && status !== 'all') {
      list = list.filter(t => t.status === status);
    }
    if (flagged === '1' || flagged === 'true') {
      list = list.filter(t => t.is_flagged === 1);
    }
    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      list = list.filter(
        t =>
          t.full_name.toLowerCase().includes(q) ||
          t.passport_number.toLowerCase().includes(q) ||
          t.evisa_number.toLowerCase().includes(q) ||
          t.esim_id.toLowerCase().includes(q) ||
          t.nationality.toLowerCase().includes(q)
      );
    }

    res.json(list);
  });

  // Get Single Traveler
  app.get('/api/travelers/:id', (req, res) => {
    const { id } = req.params;
    let traveler = db.travelers.get(id);
    if (!traveler) {
      // Find by passport or eSIM
      const list = Array.from(db.travelers.values());
      traveler = list.find(
        t =>
          t.passport_number.toUpperCase() === id.toUpperCase() ||
          t.esim_id.toUpperCase() === id.toUpperCase() ||
          t.evisa_number.toUpperCase() === id.toUpperCase()
      );
    }

    if (!traveler) {
      return res.status(404).json({ error: 'Traveler not found' });
    }

    const alerts = db.alerts.filter(a => a.traveler_id === traveler!.id);
    const extensions = Array.from(db.extensions.values()).filter(e => e.traveler_id === traveler!.id);
    const gateScans = db.gateLogs.filter(g => g.traveler_id === traveler!.id);

    res.json({
      traveler,
      alerts,
      extensions,
      gateScans,
    });
  });

  // Module 1: Arrival Registration & Smart SIM Identity Linking
  app.post('/api/travelers', (req, res) => {
    const {
      full_name,
      passport_number,
      nationality,
      entry_port,
      evisa_number,
      visa_issue_date,
      visa_expiry_date,
      esim_id,
      phone_number,
      email,
      last_latitude,
      last_longitude,
    } = req.body;

    if (!full_name || !passport_number || !evisa_number || !esim_id || !visa_expiry_date) {
      return res.status(400).json({ error: 'Missing required onboarding fields' });
    }

    // Check if passport already exists
    const existing = Array.from(db.travelers.values()).find(
      t => t.passport_number.toUpperCase() === passport_number.toUpperCase()
    );
    if (existing) {
      return res.status(400).json({ error: `Passport ${passport_number} is already registered in system.` });
    }

    const id = `TRV-2026-${String(db.travelers.size + 1).padStart(3, '0')}`;
    const newTraveler: TravelerRecord = {
      id,
      full_name: full_name.trim(),
      passport_number: passport_number.trim().toUpperCase(),
      nationality: nationality || 'Foreign National',
      entry_port: entry_port || 'DEL - Indira Gandhi Intl, New Delhi',
      evisa_number: evisa_number.trim().toUpperCase(),
      esim_id: esim_id.trim().toUpperCase(),
      phone_number: phone_number || '+91 98000 00000',
      email: email || 'tourist@example.com',
      visa_issue_date: visa_issue_date || db.formatDate(db.getCurrentSystemDate()),
      visa_expiry_date: visa_expiry_date,
      status: 'valid',
      overstay_days: 0,
      fine_amount: 0,
      is_flagged: 0,
      last_latitude: Number(last_latitude) || 28.5562,
      last_longitude: Number(last_longitude) || 77.1000,
      created_at: new Date().toISOString(),
      last_evaluated_at: new Date().toISOString(),
    };

    db.travelers.set(id, newTraveler);

    // Initial Welcome & Activation Alert
    const welcomeAlert: AlertRecord = {
      id: `ALT-${Date.now()}-WEL`,
      traveler_id: id,
      traveler_name: newTraveler.full_name,
      passport_number: newTraveler.passport_number,
      stage: 'T-10',
      recipient_phone: newTraveler.phone_number,
      recipient_email: newTraveler.email,
      message: `[e-FRRO Onboarding] Welcome to India, ${newTraveler.full_name}! Your Smart SIM (${newTraveler.esim_id}) is successfully linked to e-Visa ${newTraveler.evisa_number}. Authorized stay until ${newTraveler.visa_expiry_date}.`,
      channel: 'ESIM_PUSH',
      sent_at: new Date().toISOString(),
      status: 'DELIVERED',
    };
    db.alerts.unshift(welcomeAlert);

    // Run compliance evaluation
    db.evaluateComplianceEngine();

    res.status(201).json({
      success: true,
      message: 'Traveler registered & Smart SIM profile linked successfully.',
      traveler: db.travelers.get(id),
    });
  });

  // Resolve Overstay Case
  app.post('/api/travelers/:id/resolve', (req, res) => {
    const { id } = req.params;
    const { notes, officer_badge } = req.body;
    const traveler = db.travelers.get(id);

    if (!traveler) {
      return res.status(404).json({ error: 'Traveler not found' });
    }

    traveler.status = 'resolved';
    traveler.is_flagged = 0;
    traveler.resolution_notes = `Case resolved by Officer (${officer_badge || 'FRRO-DEL-902'}). Notes: ${notes || 'Fine paid at counter. Cleared for exit.'} [Timestamp: ${new Date().toLocaleString()}]`;

    // Send confirmation alert
    const resolveAlert: AlertRecord = {
      id: `ALT-${Date.now()}-RES`,
      traveler_id: traveler.id,
      traveler_name: traveler.full_name,
      passport_number: traveler.passport_number,
      stage: 'MANUAL_OFFICER',
      recipient_phone: traveler.phone_number,
      recipient_email: traveler.email,
      message: `[e-FRRO Clearance] Case Resolution Approved. Fine penalty cleared. Departure authorization granted by FRRO Authority.`,
      channel: 'SMS',
      sent_at: new Date().toISOString(),
      status: 'DELIVERED',
    };
    db.alerts.unshift(resolveAlert);

    res.json({
      success: true,
      message: 'Case resolved successfully.',
      traveler,
    });
  });

  // Simulated GPS Geofencing Update
  app.post('/api/travelers/:id/geofence', (req, res) => {
    const { id } = req.params;
    const { latitude, longitude, location_name } = req.body;
    const traveler = db.travelers.get(id);

    if (!traveler) {
      return res.status(404).json({ error: 'Traveler not found' });
    }

    traveler.last_latitude = Number(latitude);
    traveler.last_longitude = Number(longitude);

    // Delhi Airport Center: 28.5562° N, 77.1000° E
    const airportLat = 28.5562;
    const airportLng = 77.1000;
    const R = 6371; // km
    const dLat = (traveler.last_latitude - airportLat) * (Math.PI / 180);
    const dLon = (traveler.last_longitude - airportLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(airportLat * (Math.PI / 180)) *
        Math.cos(traveler.last_latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    const isInsideAirportGeofence = distanceKm <= 5.0;

    res.json({
      success: true,
      traveler,
      distanceKm: Number(distanceKm.toFixed(2)),
      isInsideAirportGeofence,
      geofenceStatus: isInsideAirportGeofence ? 'INSIDE_AIRPORT_ZONE' : 'OUTSIDE_AIRPORT_PERIMETER',
      evaluatedLocation: location_name || `${traveler.last_latitude}, ${traveler.last_longitude}`,
    });
  });

  // Alerts Audit Log
  app.get('/api/alerts', (req, res) => {
    const { traveler_id, stage } = req.query;
    let list = [...db.alerts];
    if (traveler_id) {
      list = list.filter(a => a.traveler_id === traveler_id);
    }
    if (stage) {
      list = list.filter(a => a.stage === stage);
    }
    res.json(list);
  });

  // Manual Alert Trigger / Dispatch
  app.post('/api/alerts/test-trigger', (req, res) => {
    const { traveler_id, stage, custom_message, channel } = req.body;
    const traveler = db.travelers.get(traveler_id);
    if (!traveler) {
      return res.status(404).json({ error: 'Traveler not found' });
    }

    const alert: AlertRecord = {
      id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      traveler_id: traveler.id,
      traveler_name: traveler.full_name,
      passport_number: traveler.passport_number,
      stage: stage || 'MANUAL_OFFICER',
      recipient_phone: traveler.phone_number,
      recipient_email: traveler.email,
      message: custom_message || `[FRRO Advisory] Direct message from Immigration Control to ${traveler.full_name}.`,
      channel: channel || 'SMS',
      sent_at: new Date().toISOString(),
      status: 'DELIVERED',
    };

    db.alerts.unshift(alert);
    broadcastLiveEvent('mobile_alert', {
      id: alert.id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'GOV-PRAVAS',
      recipient_phone: alert.recipient_phone,
      traveler_name: alert.traveler_name,
      passport_number: alert.passport_number,
      message: alert.message,
      channel: alert.channel,
      stage: alert.stage,
      carrier: 'Jio 5G',
      status: 'DELIVERED',
    });
    res.json({ success: true, alert });
  });

  // Visa Extensions
  app.get('/api/extensions', (req, res) => {
    res.json(Array.from(db.extensions.values()));
  });

  app.post('/api/extensions', (req, res) => {
    const { traveler_id, requested_days, reason, document_url } = req.body;
    const traveler = db.travelers.get(traveler_id);
    if (!traveler) {
      return res.status(404).json({ error: 'Traveler not found' });
    }

    const id = `EXT-2026-${String(db.extensions.size + 1).padStart(3, '0')}`;
    const newExt: VisaExtensionRecord = {
      id,
      traveler_id: traveler.id,
      passport_number: traveler.passport_number,
      full_name: traveler.full_name,
      requested_days: Number(requested_days) || 14,
      reason: reason || 'Travel extension for tourism / medical.',
      document_url: document_url || 'https://e-frro.gov.in/docs/sample_doc.pdf',
      status: 'pending',
      submitted_at: new Date().toISOString(),
    };

    db.extensions.set(id, newExt);
    res.status(201).json({ success: true, extension: newExt });
  });

  app.post('/api/extensions/:id/review', (req, res) => {
    const { id } = req.params;
    const { action, officer_remarks, officer_badge } = req.body; // 'approved' | 'rejected'
    const ext = db.extensions.get(id);
    if (!ext) {
      return res.status(404).json({ error: 'Extension request not found' });
    }

    ext.status = action === 'approved' ? 'approved' : 'rejected';
    ext.officer_remarks = officer_remarks || (action === 'approved' ? 'Extension granted.' : 'Application rejected.');
    ext.reviewed_at = new Date().toISOString();
    ext.reviewed_by = officer_badge || 'BOI-DEL-902';

    if (action === 'approved') {
      const traveler = db.travelers.get(ext.traveler_id);
      if (traveler) {
        // Extend expiry date
        const currExp = new Date(traveler.visa_expiry_date);
        currExp.setDate(currExp.getDate() + ext.requested_days);
        traveler.visa_expiry_date = db.formatDate(currExp);
        db.evaluateComplianceEngine();
      }
    }

    res.json({ success: true, extension: ext });
  });

  // ----------------------------------------------------
  // Module 6: Hardware E-Gate Simulation REST Endpoint
  // GET /api/gate/scan/:identifier
  // ----------------------------------------------------
  app.get('/api/gate/scan/:identifier', (req, res) => {
    const { identifier } = req.params;
    const gate_id = 'PRAVAS_EGATE_DEL_T3_04';

    // Search by passport, esim_id, or traveler id
    const cleanId = decodeURIComponent(identifier).trim().toUpperCase();
    let traveler: TravelerRecord | undefined = undefined;

    for (const t of db.travelers.values()) {
      if (
        t.passport_number.toUpperCase() === cleanId ||
        t.esim_id.toUpperCase() === cleanId ||
        t.id.toUpperCase() === cleanId ||
        t.evisa_number.toUpperCase() === cleanId
      ) {
        traveler = t;
        break;
      }
    }

    if (!traveler) {
      const resp = {
        gate_id,
        passport_number: cleanId,
        full_name: 'UNKNOWN PASSENGER',
        status: 'unregistered',
        overstay_days: 0,
        fine: 0.0,
        message: 'NO VALID VISA RECORD FOUND! Turn to Immigration Helpdesk.',
        gate_action: 'DENIED' as const,
        audio_voice_alert: 'Attention: No visa record found for this passport. Gate access denied. Report to immigration counter.',
      };

      db.gateLogs.unshift({
        id: `GLOG-${Date.now()}`,
        gate_identifier: gate_id,
        traveler_id: 'UNREGISTERED',
        passport_number: cleanId,
        full_name: 'UNKNOWN PASSENGER',
        scanned_status: 'unregistered',
        overstay_days: 0,
        fine_assessed: 0,
        action_taken: 'DENIED',
        message: resp.message,
        scanned_at: new Date().toISOString(),
      });

      broadcastLiveEvent('gate_scan', {
        gate_id,
        passport_number: cleanId,
        full_name: 'UNKNOWN PASSENGER',
        gate_action: 'DENIED',
        message: resp.message,
        fine: 0,
        overstay_days: 0,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json(resp);
    }

    let gate_action: 'GRANTED' | 'DENIED' = 'GRANTED';
    let message = '';
    let audio_voice_alert = '';

    if (traveler.status === 'overstayed') {
      gate_action = 'DENIED';
      message = `OVERSTAY DETECTED! Fine Pending: INR ${traveler.fine_amount.toLocaleString('en-IN')}. Turn to Counter 4.`;
      audio_voice_alert = `Attention: Overstay detected for passenger ${traveler.full_name}. Penalty fine rupees ${traveler.fine_amount}. Report to immigration counter.`;
    } else if (traveler.status === 'resolved') {
      gate_action = 'GRANTED';
      message = `PENALTY RESOLVED & CLEARED. Welcome aboard ${traveler.full_name}. Have a safe flight.`;
      audio_voice_alert = `Clearance verified for passenger ${traveler.full_name}. Gate opening. Have a safe journey.`;
    } else {
      gate_action = 'GRANTED';
      message = `COMPLIANCE VERIFIED: Valid e-Visa (${traveler.evisa_number}). Gate open.`;
      audio_voice_alert = `Clearance verified for passenger ${traveler.full_name}. Gate opening. Have a safe journey.`;
    }

    const responseData = {
      gate_id,
      passport_number: traveler.passport_number,
      full_name: traveler.full_name,
      status: traveler.status,
      overstay_days: traveler.overstay_days,
      fine: Number(traveler.fine_amount.toFixed(1)),
      message,
      gate_action,
      audio_voice_alert,
    };

    db.gateLogs.unshift({
      id: `GLOG-${Date.now()}`,
      gate_identifier: gate_id,
      traveler_id: traveler.id,
      passport_number: traveler.passport_number,
      full_name: traveler.full_name,
      scanned_status: traveler.status,
      overstay_days: traveler.overstay_days,
      fine_assessed: traveler.fine_amount,
      action_taken: gate_action,
      message,
      scanned_at: new Date().toISOString(),
    });

    // Broadcast gate scan event to all live receivers
    broadcastLiveEvent('gate_scan', {
      gate_id,
      passport_number: traveler.passport_number,
      full_name: traveler.full_name,
      gate_action,
      message,
      fine: traveler.fine_amount,
      overstay_days: traveler.overstay_days,
      timestamp: new Date().toISOString(),
    });

    // Also push a live mobile message to the passenger's phone!
    const mobileGateMsg = gate_action === 'GRANTED'
      ? `[Pravas E-Dwar Departure Clearance] Verified passenger ${traveler.full_name}. Gate ${gate_id} OPEN. Departure authorized. Have a safe flight! 🇮🇳`
      : `[Pravas E-Dwar ALERT: ACCESS DENIED] Passenger ${traveler.full_name}, gate departure blocked! Unsettled fine INR ${traveler.fine_amount.toLocaleString('en-IN')}. Report to Counter 4.`;

    broadcastLiveEvent('mobile_alert', {
      id: `ALT-GATE-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'PRAVAS-DWAR',
      recipient_phone: traveler.phone_number,
      traveler_name: traveler.full_name,
      passport_number: traveler.passport_number,
      message: mobileGateMsg,
      channel: 'SMS',
      stage: 'GATE_EVENT',
      carrier: 'Jio 5G',
      status: 'DELIVERED',
    });

    res.json(responseData);
  });

  // Gate Logs
  app.get('/api/gate/logs', (req, res) => {
    res.json(db.gateLogs);
  });

  // Reset database to initial seed
  app.post('/api/seed/reset', (req, res) => {
    db.systemDateOffsetDays = 0;
    db.seedDatabase();
    res.json({ success: true, message: 'Database reset to initial demo seeds.' });
  });

  // ----------------------------------------------------
  // Vite Integration for Dev & Prod
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[e-Pravas Suraksha] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
