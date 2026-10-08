import React from 'react';
import { LiveMobileMessage } from '../types';
import {
  Smartphone,
  Share2,
  X,
  BellRing,
  ShieldCheck,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface LiveNotificationToastProps {
  notification: LiveMobileMessage | null;
  onClose: () => void;
  onOpenPhone: () => void;
}

export const LiveNotificationToast: React.FC<LiveNotificationToastProps> = ({
  notification,
  onClose,
  onOpenPhone,
}) => {
  if (!notification) return null;

  const isUrgent =
    notification.stage === 'DAILY_OVERSTAY' ||
    notification.message.includes('OVERSTAY') ||
    notification.message.includes('CRITICAL');

  const openInWhatsApp = () => {
    const cleanPhone = notification.recipient_phone.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
      notification.message
    )}`;
    window.open(url, '_blank');
  };

  return (
    <aside
      aria-label="Live mobile alert toast"
      className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-[calc(100vw-2rem)] animate-bounce-short shadow-2xl transition-all"
    >
      <div
        className={`rounded-2xl p-4 border backdrop-blur-xl text-xs space-y-2.5 ${
          isUrgent
            ? 'bg-gradient-to-r from-rose-950/95 to-slate-950/95 border-rose-500/70 text-rose-100 shadow-rose-950/50'
            : 'bg-gradient-to-r from-blue-950/95 via-slate-900/95 to-indigo-950/95 border-cyan-500/60 text-slate-100 shadow-blue-950/50'
        }`}
      >
        {/* Banner Top Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-[10px] font-bold text-white shadow">
              🇮🇳
            </div>
            <div>
              <div className="font-extrabold text-white flex items-center gap-1.5">
                <span>{notification.sender}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                  {notification.carrier || 'Jio 5G'}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold uppercase">
                  DELIVERED
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                To: {notification.traveler_name} ({notification.recipient_phone})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">{notification.timestamp}</span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition p-1"
              title="Close alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Content */}
        <p className="text-xs leading-relaxed font-sans text-slate-200">
          {notification.message}
        </p>

        {/* Actions Footer */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Mobile Device Alerted</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openInWhatsApp}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition"
              title="Open alert in official WhatsApp"
            >
              <Share2 className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => {
                onOpenPhone();
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow transition"
              title="View on Virtual Mobile Screen"
            >
              <Smartphone className="w-3 h-3" />
              <span>View Phone</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
