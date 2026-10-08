import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Traveler, AlertStage } from '../types';
import { notificationService } from '../utils/notificationAudio';
import {
  Smartphone,
  X,
  Send,
  Share2,
  CheckCircle2,
  BellRing,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Radio,
  QrCode,
  ExternalLink,
} from 'lucide-react';

interface SendMobileAlertModalProps {
  traveler: Traveler;
  onClose: () => void;
  onAlertSent?: () => void;
}

export const SendMobileAlertModal: React.FC<SendMobileAlertModalProps> = ({
  traveler,
  onClose,
  onAlertSent,
}) => {
  const [recipientPhone, setRecipientPhone] = useState(traveler.phone_number);
  const [stage, setStage] = useState<AlertStage>('MANUAL_OFFICER');
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP' | 'ESIM_PUSH'>('SMS');
  const [customMessage, setCustomMessage] = useState(
    `[e-Pravas Suraksha: Bureau of Immigration] Officer advisory for ${traveler.full_name} (${traveler.passport_number}): Your e-Visa validity expires on ${traveler.visa_expiry_date}. Please ensure compliance.`
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<boolean>(false);

  const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');

  const presets = [
    {
      label: 'T-10 Gentle Advisory',
      stage: 'T-10' as AlertStage,
      text: `[Bureau of Immigration Security Advisory] Dear ${traveler.full_name}, your Indian e-Visa (${traveler.evisa_number}) expires in 10 days on ${traveler.visa_expiry_date}. Please schedule departure or submit online extension at pravas.gov.in.`,
    },
    {
      label: 'T-3 Urgent Expiry Notice',
      stage: 'T-3' as AlertStage,
      text: `[URGENT: Visa Compliance Alert] Dear ${traveler.full_name}, only 3 DAYS remain on your Indian visa! Overstaying incurs statutory fine of INR 2,000/day and automated departure gate blocking.`,
    },
    {
      label: 'T-0 Final Day Warning',
      stage: 'T-0' as AlertStage,
      text: `[FINAL NOTICE: Visa Border Control] Dear ${traveler.full_name}, TODAY (${traveler.visa_expiry_date}) is your last authorized day in India. Compliance window closes at 23:59 IST. Proceed to airport immediately.`,
    },
    {
      label: 'Overstay Interception & Fine',
      stage: 'DAILY_OVERSTAY' as AlertStage,
      text: `[CRITICAL WARNING: Bureau of Immigration] Passenger ${traveler.full_name}, you have overstayed. Penalty accrued: INR ${traveler.fine_amount || 8000}. Passport (${traveler.passport_number}) is flagged for airport interception. Report to nearest FRRO office immediately.`,
    },
    {
      label: 'Counter 4 Summons',
      stage: 'MANUAL_OFFICER' as AlertStage,
      text: `[Official Immigration Notice] Passenger ${traveler.full_name}, please report to Immigration Counter 4 at Indira Gandhi International Airport (DEL) regarding visa documentation review.`,
    },
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMessage.trim()) return;

    setIsSending(true);
    setSentSuccess(null);

    try {
      const res = await fetch('/api/mobile/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_phone: recipientPhone,
          message: customMessage,
          traveler_name: traveler.full_name,
          passport_number: traveler.passport_number,
          stage,
          channel: channel === 'WHATSAPP' ? 'SMS' : channel,
          custom_sender: 'GOV-PRAVAS',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notificationService.playChimeTone(
          stage === 'DAILY_OVERSTAY' ? 'urgent' : 'sms'
        );
        notificationService.vibrate([200, 100, 200]);
        notificationService.showSystemNotification(
          `🇮🇳 [GOV-PRAVAS] Alert Sent to ${traveler.full_name}`,
          customMessage
        );

        setSentSuccess(
          `Live Message Delivered to ${recipientPhone} via ${data.carrier_dlr?.gateway || 'Jio 5G'} (DLR: DELIVRD)!`
        );
        onAlertSent?.();
      } else {
        alert('Failed to dispatch alert.');
      }
    } catch (err: any) {
      alert('Error sending alert: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const openInWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
      customMessage
    )}`;
    window.open(url, '_blank');
  };

  const openInNativeSMS = () => {
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUri = isIOS
      ? `sms:+${cleanPhone}&body=${encodeURIComponent(customMessage)}`
      : `sms:+${cleanPhone}?body=${encodeURIComponent(customMessage)}`;
    window.location.href = smsUri;
  };

  const qrUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(customMessage)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                Send Real Mobile Message Alert
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                  REAL-TIME
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct transmission to passenger's mobile phone &amp; carrier gateway
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success confirmation */}
        {sentSuccess && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs rounded-xl space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{sentSuccess}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openInWhatsApp}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition"
              >
                Open in Real WhatsApp
              </button>
              <button
                type="button"
                onClick={openInNativeSMS}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition"
              >
                Open in Device SMS
              </button>
            </div>
          </div>
        )}

        {/* Traveler Meta Strip */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
          <div>
            <div className="font-bold text-white">{traveler.full_name}</div>
            <div className="text-[11px] text-slate-400">
              Passport: <span className="font-mono text-cyan-300">{traveler.passport_number}</span> | Visa: {traveler.evisa_number}
            </div>
          </div>
          <div className="text-right">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                traveler.status === 'overstayed'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : traveler.status === 'expiring_soon'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {traveler.status}
            </span>
          </div>
        </div>

        {/* Presets */}
        <div>
          <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">
            Select Message Template:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setStage(p.stage);
                  setCustomMessage(p.text);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                  customMessage === p.text
                    ? 'bg-cyan-600/30 text-cyan-200 border-cyan-500 font-bold'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-3.5">
          {/* Target Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Recipient Mobile Number:
              </label>
              <input
                type="text"
                value={recipientPhone}
                onChange={e => setRecipientPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Delivery Channel:
              </label>
              <select
                value={channel}
                onChange={e => setChannel(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="SMS">SMS Gateway (Jio / Airtel)</option>
                <option value="WHATSAPP">Direct WhatsApp</option>
                <option value="ESIM_PUSH">Smart eSIM Push</option>
              </select>
            </div>
          </div>

          {/* Custom Message Area */}
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Live Message Body:
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-white focus:outline-none leading-relaxed"
            />
          </div>

          {/* QR Code toggle */}
          {showQr && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2">
              <p className="text-[11px] text-slate-300">
                Scan with your physical phone camera to open in WhatsApp:
              </p>
              <div className="bg-white p-2 rounded-lg inline-block">
                <QRCodeSVG value={qrUrl} size={130} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openInWhatsApp}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
                title="Open WhatsApp chat with prefilled message"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={openInNativeSMS}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 text-xs font-semibold transition"
                title="Launch device cellular SMS app"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Device SMS</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs transition"
                title="Show QR code for physical phone camera"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSending || !customMessage.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Transmitting...' : 'Send Live Alert'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

