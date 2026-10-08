import React, { useState, useEffect, useRef } from 'react';
import { Traveler, Alert, LiveMobileMessage } from '../types';
import { notificationService } from '../utils/notificationAudio';
import {
  Smartphone,
  BellRing,
  Send,
  Volume2,
  VolumeX,
  Vibrate,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  ExternalLink,
  PhoneCall,
  Share2,
  Zap,
  Sparkles,
  Wifi,
  Battery,
  ShieldCheck,
  RotateCcw,
  QrCode,
  Flame,
} from 'lucide-react';

interface LiveMobileReceiverProps {
  travelers: Traveler[];
  onOpenPass?: (travelerId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const LiveMobileReceiver: React.FC<LiveMobileReceiverProps> = ({
  travelers,
  onOpenPass,
  onNavigateTab,
}) => {
  // Recipient Configuration
  const [userMobileNumber, setUserMobileNumber] = useState<string>('+91 98112 34501');
  const [recipientName, setRecipientName] = useState<string>('Kenji Takahashi');
  const [selectedTravelerPassport, setSelectedTravelerPassport] = useState<string>('JP8829102');

  // Device & Feedback Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Custom Message Form
  const [customText, setCustomText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);
  const [lastDeliveredAck, setLastDeliveredAck] = useState<string | null>(null);

  // Messages in the Virtual Phone
  const [messages, setMessages] = useState<LiveMobileMessage[]>([
    {
      id: 'MOB-INIT-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'GOV-PRAVAS',
      recipient_phone: '+91 98112 34501',
      traveler_name: 'Kenji Takahashi',
      passport_number: 'JP8829102',
      message: '[e-Pravas Suraksha: Bureau of Immigration] Welcome to India! Smart SIM linked with e-Visa IND-EV-661209. Valid stay until 10 days.',
      channel: 'SMS',
      stage: 'T-10',
      carrier: 'Jio 5G',
      status: 'DELIVERED',
    },
    {
      id: 'MOB-INIT-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'GOV-PRAVAS',
      recipient_phone: '+91 98112 34501',
      traveler_name: 'Kenji Takahashi',
      passport_number: 'JP8829102',
      message: '[URGENT: e-Pravas Compliance] Dear Kenji Takahashi, your Indian e-Visa expires in 10 days. Please schedule departure or submit online extension on Pravas portal.',
      channel: 'SMS',
      stage: 'T-10',
      carrier: 'Jio 5G',
      status: 'DELIVERED',
    },
  ]);

  // Telecom SMPP Gateway logs
  const [gatewayLogs, setGatewayLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] SMPP Gateway Bind OK: Connected to Jio Telecom SMPP Server (delhi-hub-01).`,
    `[${new Date().toLocaleTimeString()}] DLVR-ACK #JIO-9820-01 received for +91 98112 34501: DELIVRD.`,
  ]);

  const phoneScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of phone messages when new message arrives
  useEffect(() => {
    if (phoneScrollRef.current) {
      phoneScrollRef.current.scrollTop = phoneScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Connect to live Server-Sent Events (SSE) stream from backend
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/live-stream');

      eventSource.onopen = () => {
        setStreamConnected(true);
        addGatewayLog('Connected to e-Pravas Live Push Stream (/api/live-stream).');
      };

      eventSource.addEventListener('mobile_alert', (e: any) => {
        try {
          const data: LiveMobileMessage = JSON.parse(e.data);
          handleIncomingLiveMessage(data);
        } catch (err) {
          console.error('SSE mobile_alert parse error:', err);
        }
      });

      eventSource.addEventListener('gate_scan', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          const scanMsg: LiveMobileMessage = {
            id: 'GATE-SCAN-' + Date.now(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender: 'PRAVAS-DWAR',
            recipient_phone: userMobileNumber,
            traveler_name: data.full_name,
            passport_number: data.passport_number,
            message: data.gate_action === 'GRANTED'
              ? `[Smart E-Gate: Clear] Passenger ${data.full_name}, departure clearance VERIFIED at Gate ${data.gate_id}. Boarding open.`
              : `[Smart E-Gate: ALERT] Interception at Gate ${data.gate_id}! Passenger ${data.full_name} blocked. Overstay penalty: INR ${data.fine}. Report to Counter 4.`,
            channel: 'SMS',
            stage: 'GATE_EVENT',
            carrier: 'Airtel 5G',
            status: 'DELIVERED',
          };
          handleIncomingLiveMessage(scanMsg);
        } catch (err) {
          console.error('SSE gate_scan parse error:', err);
        }
      });

      eventSource.onerror = () => {
        setStreamConnected(false);
      };
    } catch (err) {
      console.warn('EventSource failed to initialize:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [userMobileNumber, soundEnabled, vibrationEnabled, speechEnabled]);

  const addGatewayLog = (text: string) => {
    setGatewayLogs(prev => [`[${new Date().toLocaleTimeString()}] ${text}`, ...prev.slice(0, 20)]);
  };

  // Central handler when any live message is received
  const handleIncomingLiveMessage = (msg: LiveMobileMessage) => {
    setMessages(prev => [...prev, msg]);

    // 1. Audio tone
    if (soundEnabled) {
      const type = msg.stage === 'DAILY_OVERSTAY' || msg.message.includes('OVERSTAY')
        ? 'urgent'
        : msg.stage === 'GATE_EVENT'
        ? 'gate'
        : 'sms';
      notificationService.playChimeTone(type);
    }

    // 2. Mobile vibration
    if (vibrationEnabled) {
      notificationService.vibrate([200, 100, 250, 100, 200]);
    }

    // 3. Native system push notification
    if (Notification.permission === 'granted') {
      notificationService.showSystemNotification(
        `🇮🇳 [${msg.sender}] Live Visa Alert`,
        msg.message
      );
    }

    // 4. Voice speech readout
    if (speechEnabled) {
      notificationService.speakAlert(msg.message);
    }

    // 5. Gateway log
    addGatewayLog(`SMS Delivered to ${msg.recipient_phone} via ${msg.carrier || 'Jio 5G'} (DLR: DELIVRD)`);
    setLastDeliveredAck(`Live Alert Delivered to ${msg.recipient_phone} at ${new Date().toLocaleTimeString()}`);
    setTimeout(() => setLastDeliveredAck(null), 5000);
  };

  // Request browser native notification permission
  const handleEnablePushNotifications = async () => {
    const perm = await notificationService.requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      notificationService.playChimeTone('sms');
      notificationService.showSystemNotification(
        '🇮🇳 e-Pravas Suraksha: Notifications Activated',
        'You will now receive instant live mobile & desktop compliance messages for visa updates!'
      );
    } else {
      alert('Notification permission was ' + perm + '. You can still use the virtual mobile phone and WhatsApp live alerts.');
    }
  };

  // Send a Live Message (via Backend API -> Broadcasted over SSE)
  const dispatchLiveMessage = async (
    text: string,
    stage: any = 'CUSTOM_TEST',
    customPhone?: string,
    travelerName?: string,
    passportNum?: string
  ) => {
    setIsSending(true);
    const targetPhone = customPhone || userMobileNumber;
    const name = travelerName || recipientName;
    const passport = passportNum || selectedTravelerPassport;

    try {
      const res = await fetch('/api/mobile/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_phone: targetPhone,
          message: text,
          traveler_name: name,
          passport_number: passport,
          stage,
          channel: 'SMS',
          custom_sender: 'GOV-PRAVAS',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Fallback if SSE isn't active
        if (!streamConnected) {
          handleIncomingLiveMessage(data.alert);
        }
      }
    } catch (err: any) {
      console.error('Failed to notify mobile:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Quick Preset Scenarios
  const handleSendT10 = () => {
    dispatchLiveMessage(
      `[e-Pravas Suraksha: Bureau of Immigration] Dear ${recipientName}, your Indian e-Visa (${selectedTravelerPassport}) expires in 10 days. Please plan your exit or apply for an online extension at pravas.gov.in.`,
      'T-10'
    );
  };

  const handleSendT3 = () => {
    dispatchLiveMessage(
      `[URGENT: Visa Compliance Alert] Dear ${recipientName}, only 3 DAYS remain on your Indian visa! Overstaying incurs statutory fine of INR 2,000/day & automated departure gate blocking.`,
      'T-3'
    );
  };

  const handleSendT0 = () => {
    dispatchLiveMessage(
      `[FINAL NOTICE: Visa Border Control] Dear ${recipientName}, TODAY is your last authorized day in India. Compliance window closes at 23:59 IST. Please report to departure terminal immediately.`,
      'T-0'
    );
  };

  const handleSendOverstay = () => {
    dispatchLiveMessage(
      `[CRITICAL NOTICE: Bureau of Immigration] Passenger ${recipientName}, you have OVERSTAYED by 4 days. Current accrued penalty fine: INR 8,000. Passport (${selectedTravelerPassport}) is flagged at all airports. Report to FRRO counter immediately.`,
      'DAILY_OVERSTAY'
    );
  };

  const handleSendGateGranted = () => {
    dispatchLiveMessage(
      `[Smart Departure E-Gate Clearance] Verified passenger ${recipientName}. Gate GATE-T3-04 is OPEN. Departure authorized. Have a safe flight from India! 🇮🇳`,
      'GATE_EVENT'
    );
  };

  const handleSendGateDenied = () => {
    dispatchLiveMessage(
      `[Smart E-Gate ALERT: ACCESS DENIED] Passport ${selectedTravelerPassport} is BLOCKED at departure gate. Unsettled overstay penalty INR 8,000 pending. Escort to Counter 4 required.`,
      'GATE_EVENT'
    );
  };

  // WhatsApp Deep Link Helper
  const openInWhatsApp = (text: string, phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-800/40 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Official Visa Notification Engine • Live Mobile Messaging
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              (Government of India Mobile Gateway)
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Live Mobile Phone Notifications
            <span className="text-xs font-normal text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-md border border-cyan-800/50">
              Real-Time Push &amp; SMS
            </span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Simulates and fires authentic live government compliance messages to mobile phones with native system push notifications, Web Audio ringtones, phone vibration, and direct WhatsApp dispatches.
          </p>
        </div>

        {/* Live Stream & Native Notification Status Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {notificationPermission !== 'granted' ? (
            <button
              onClick={handleEnablePushNotifications}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition transform hover:-translate-y-0.5"
            >
              <BellRing className="w-4 h-4 animate-bounce" />
              <span>Enable Real Device Notifications</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Native Push: ACTIVE on your Device</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300">
            <Radio className={`w-3.5 h-3.5 ${streamConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
            <span>{streamConnected ? 'Live SSE Connected' : 'Connecting Stream...'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls + Interactive Virtual Phone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Dispatch Station & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recipient Setup Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Target Mobile Phone Recipient</h3>
              </div>
              <span className="text-[11px] text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
                Carrier: Jio 5G / Airtel 5G
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Recipient Mobile Number (You can enter yours!):
                </label>
                <input
                  type="text"
                  value={userMobileNumber}
                  onChange={e => setUserMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Passenger / Traveler Name:
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="e.g. Kenji Takahashi"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Traveler Selectors */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1.5">
                Quick Select from Registered Travelers:
              </label>
              <div className="flex flex-wrap gap-2">
                {travelers.slice(0, 5).map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setUserMobileNumber(t.phone_number);
                      setRecipientName(t.full_name);
                      setSelectedTravelerPassport(t.passport_number);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                      recipientName === t.full_name
                        ? 'bg-blue-600/30 text-blue-200 border-blue-500 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{t.full_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({t.phone_number})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Audio, Vibration, Voice Toggles */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-medium">Real-Time Feedback:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    if (!soundEnabled) notificationService.playChimeTone('sms');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition ${
                    soundEnabled
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                  title="Play real SMS ringtone tone on incoming message"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{soundEnabled ? 'SMS Chime ON' : 'Chime Muted'}</span>
                </button>

                <button
                  onClick={() => {
                    setVibrationEnabled(!vibrationEnabled);
                    if (!vibrationEnabled) notificationService.vibrate([150, 50, 150]);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition ${
                    vibrationEnabled
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/50'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                  title="Trigger phone haptic vibration on mobile devices"
                >
                  <Vibrate className="w-3.5 h-3.5" />
                  <span>{vibrationEnabled ? 'Vibration ON' : 'Vibrate OFF'}</span>
                </button>

                <button
                  onClick={() => {
                    setSpeechEnabled(!speechEnabled);
                    if (!speechEnabled) notificationService.speakAlert('Voice readout enabled');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition ${
                    speechEnabled
                      ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                  title="Vocalize message aloud via speech synthesis"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{speechEnabled ? 'Voice Aloud ON' : 'Voice Readout'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick 1-Click Live Test Scenarios */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">1-Click Live Mobile Alert Dispatches</h3>
              </div>
              <span className="text-[11px] text-slate-400">Instantly fires to screen &amp; phone</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleSendOverstay}
                disabled={isSending}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-rose-950/60 to-red-900/40 border border-rose-600/40 hover:border-rose-500 text-left transition group"
              >
                <div>
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Overstay Interception (₹8,000)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Critical warning + airport block notice</div>
                </div>
                <Send className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={handleSendT3}
                disabled={isSending}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-950/60 to-orange-900/40 border border-amber-600/40 hover:border-amber-500 text-left transition group"
              >
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    T-3 Urgent Expiry Notice
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">3 days left to departure or extension</div>
                </div>
                <Send className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={handleSendT0}
                disabled={isSending}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-950/60 to-amber-900/40 border border-orange-600/40 hover:border-orange-500 text-left transition group"
              >
                <div>
                  <div className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    T-0 Final Day Notice (Today)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Final compliance window closes 23:59 IST</div>
                </div>
                <Send className="w-3.5 h-3.5 text-orange-400 group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={handleSendT10}
                disabled={isSending}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-950/60 to-indigo-900/40 border border-blue-600/40 hover:border-blue-500 text-left transition group"
              >
                <div>
                  <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-blue-400" />
                    T-10 Gentle Expiry Reminder
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">10 days remaining advisory</div>
                </div>
                <Send className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={handleSendGateGranted}
                disabled={isSending}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-900/40 border border-emerald-600/40 hover:border-emerald-500 text-left transition group"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Departure E-Gate Clearance: GRANTED
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Valid biometric &amp; pass authorized</div>
                </div>
                <Send className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={handleSendGateDenied}
                disabled={isSending}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-rose-950/60 to-pink-900/40 border border-rose-600/40 hover:border-rose-500 text-left transition group"
              >
                <div>
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Departure E-Gate Clearance: DENIED
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Overstay gate lock trigger</div>
                </div>
                <Send className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

          {/* Custom SMS Dispatch Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Compose Live Custom SMS to Mobile</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Sender: GOV-PRAVAS</span>
            </div>

            <textarea
              rows={2}
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              placeholder={`[e-Pravas Suraksha: Bureau of Immigration] Type any custom alert to send live to ${userMobileNumber}...`}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none"
            />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-[11px] text-slate-400">
                Delivering via SMPP protocol to carrier tower.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openInWhatsApp(customText || `[e-Pravas Suraksha: Govt of India] Notice for ${recipientName} (${userMobileNumber}): Your e-Visa status is monitored under Bureau of Immigration.`, userMobileNumber)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!customText.trim()) return;
                    dispatchLiveMessage(customText, 'MANUAL_OFFICER');
                    setCustomText('');
                  }}
                  disabled={isSending || !customText.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Transmitting...' : 'Dispatch Live SMS'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Carrier & SMPP Telemetry Logs */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                Live Telecom SMPP Gateway Telemetry
              </span>
              <span className="text-[10px] text-emerald-400">Carrier Ack: DELIVRD</span>
            </div>
            <div className="h-24 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
              {gatewayLogs.map((log, i) => (
                <div key={i} className="text-slate-400 hover:text-slate-200">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Virtual Smartphone Device Receiver (5 cols) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[360px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 relative ring-1 ring-slate-700/50">
            {/* Phone Screen Outer Shell */}
            <div className="w-full h-[620px] bg-slate-950 rounded-[36px] overflow-hidden flex flex-col border border-slate-800 shadow-inner relative">
              {/* Phone Status Bar */}
              <div className="h-10 bg-slate-900/90 px-6 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300 border-b border-slate-800/60 select-none">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {/* Dynamic Island / Speaker Notch */}
                <div className="w-20 h-4 bg-black rounded-full border border-slate-800 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-800 mr-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-900" />
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-[10px] font-bold text-emerald-400">Jio 5G</span>
                  <Wifi className="w-3 h-3 text-slate-300" />
                  <Battery className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>

              {/* Phone App Header */}
              <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-3 border-b border-blue-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 p-0.5 shadow">
                    <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-amber-400 font-bold text-xs">
                      🇮🇳
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      GOV-PRAVAS
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-[10px] text-slate-400">Bureau of Immigration, MHA</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMessages([])}
                    className="p-1 text-slate-400 hover:text-slate-200 transition"
                    title="Clear device messages"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
              </div>

              {/* Verified Sender Notice Bar */}
              <div className="bg-blue-950/30 px-3 py-1 text-[10px] text-cyan-300 border-b border-blue-900/30 flex items-center justify-between">
                <span>Verified Official Sender (TRAI Approved)</span>
                <span className="font-mono">{userMobileNumber}</span>
              </div>

              {/* Messages Body */}
              <div
                ref={phoneScrollRef}
                className="flex-1 p-3 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-950 via-slate-900/70 to-slate-950 scrollbar-thin scrollbar-thumb-slate-800"
              >
                {/* Date Header */}
                <div className="text-center my-1">
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-800">
                    Today, {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-slate-500">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-xs">No active alerts on device.</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Click any test alert on the left to fire a live mobile message.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isUrgent = msg.stage === 'DAILY_OVERSTAY' || msg.message.includes('OVERSTAY') || msg.message.includes('BLOCKED');
                    const isWarning = msg.stage === 'T-3' || msg.stage === 'T-0';
                    const isGate = msg.stage === 'GATE_EVENT';

                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-2xl text-xs space-y-2 shadow-md animate-fadeIn transition border ${
                          isUrgent
                            ? 'bg-rose-950/80 border-rose-600/60 text-rose-100'
                            : isWarning
                            ? 'bg-amber-950/70 border-amber-600/50 text-amber-100'
                            : isGate
                            ? 'bg-teal-950/70 border-teal-600/50 text-teal-100'
                            : 'bg-slate-900/90 border-slate-800 text-slate-200'
                        }`}
                      >
                        {/* Message Top Meta */}
                        <div className="flex items-center justify-between text-[10px] pb-1 border-b border-white/10">
                          <span className="font-bold flex items-center gap-1">
                            {msg.sender}
                            <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-white font-normal">
                              {msg.carrier || 'Jio 5G'}
                            </span>
                          </span>
                          <span className="opacity-70 font-mono">{msg.timestamp}</span>
                        </div>

                        {/* Message Content */}
                        <p className="text-[11.5px] leading-relaxed font-sans">{msg.message}</p>

                        {/* Interactive Mobile Action Buttons */}
                        <div className="pt-1.5 border-t border-white/10 flex flex-wrap gap-1.5">
                          {msg.message.includes('extension') && onNavigateTab && (
                            <button
                              onClick={() => onNavigateTab('tourist')}
                              className="text-[10px] px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
                            >
                              Apply for Extension
                            </button>
                          )}

                          {onOpenPass && (
                            <button
                              onClick={() => onNavigateTab ? onNavigateTab('tourist') : null}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1 transition"
                            >
                              <QrCode className="w-2.5 h-2.5" />
                              View QR Pass
                            </button>
                          )}

                          <button
                            onClick={() => openInWhatsApp(msg.message, userMobileNumber)}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold flex items-center gap-1 transition ml-auto"
                            title="Forward to real WhatsApp chat"
                          >
                            <Share2 className="w-2.5 h-2.5" />
                            WhatsApp
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Phone Virtual Keyboard Input Dock */}
              <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Reply to GOV-PRAVAS..."
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customText.trim()) {
                      dispatchLiveMessage(customText, 'MANUAL_OFFICER');
                      setCustomText('');
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-full px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customText.trim()) return;
                    dispatchLiveMessage(customText, 'MANUAL_OFFICER');
                    setCustomText('');
                  }}
                  disabled={!customText.trim()}
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="h-4 bg-slate-950 flex items-center justify-center">
                <div className="w-28 h-1 bg-slate-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
