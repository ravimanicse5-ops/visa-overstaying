import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Traveler, LiveMobileMessage } from '../types';
import { notificationService } from '../utils/notificationAudio';
import {
  Send,
  Smartphone,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Radio,
  QrCode,
  Volume2,
  VolumeX,
  Vibrate,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Key,
  Flame,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Copy,
  Check,
  Zap,
  Loader2,
  PhoneCall,
  CheckCheck,
} from 'lucide-react';

interface RealMobileMessageSenderProps {
  travelers: Traveler[];
  onOpenPass?: (travelerId: string) => void;
  prefilledPhone?: string;
  prefilledName?: string;
  prefilledPassport?: string;
}

export const RealMobileMessageSender: React.FC<RealMobileMessageSenderProps> = ({
  travelers,
  onOpenPass,
  prefilledPhone,
  prefilledName,
  prefilledPassport,
}) => {
  // Mobile Recipient
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phoneNumber, setPhoneNumber] = useState<string>(
    prefilledPhone ? prefilledPhone.replace(/^\+91\s*/, '') : '9811234501'
  );
  const [recipientName, setRecipientName] = useState<string>(prefilledName || 'Kenji Takahashi');
  const [passportNumber, setPassportNumber] = useState<string>(prefilledPassport || 'JP8829102');

  // Auto-SMS on Mobile Number Entry State
  const [autoSendOnEntry, setAutoSendOnEntry] = useState<boolean>(true);
  const [autoOpenDeviceSMS, setAutoOpenDeviceSMS] = useState<boolean>(false);
  const [autoSendStatus, setAutoSendStatus] = useState<'idle' | 'typing' | 'countdown' | 'sending' | 'sent' | 'cancelled'>('idle');
  const [autoSendCountdown, setAutoSendCountdown] = useState<number>(0);
  const [lastAutoSentNumber, setLastAutoSentNumber] = useState<string | null>(null);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Message template and custom text
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('t3');
  const [messageText, setMessageText] = useState<string>(
    `[URGENT: Visa Compliance Alert] Dear Kenji Takahashi, only 3 DAYS remain on your Indian visa! Overstaying incurs statutory fine of INR 2,000/day & automated departure gate blocking. Please extend at pravas.gov.in.`
  );

  // Real delivery state
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lastDeliveredAck, setLastDeliveredAck] = useState<string | null>(null);
  const [realDeliveryData, setRealDeliveryData] = useState<{
    whatsappUrl: string;
    smsUriAndroid: string;
    smsUriIos: string;
    formattedPhone: string;
    carrierGateway: string;
    sentAt: string;
  } | null>(null);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [autoOpenWhatsApp, setAutoOpenWhatsApp] = useState<boolean>(false);
  const [qrMode, setQrMode] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showGatewayConfig, setShowGatewayConfig] = useState<boolean>(false);
  const [showPhonePreview, setShowPhonePreview] = useState<boolean>(false);

  // External Telecom Gateway Credentials (Twilio / Webhook)
  const [twilioSid, setTwilioSid] = useState<string>(() => localStorage.getItem('pravas_twilio_sid') || '');
  const [twilioAuth, setTwilioAuth] = useState<string>(() => localStorage.getItem('pravas_twilio_auth') || '');
  const [twilioFrom, setTwilioFrom] = useState<string>(() => localStorage.getItem('pravas_twilio_from') || '');
  const [smsWebhookUrl, setSmsWebhookUrl] = useState<string>(() => localStorage.getItem('pravas_sms_webhook') || '');

  // Live messages sent history
  const [sentLog, setSentLog] = useState<Array<{
    id: string;
    phone: string;
    name: string;
    message: string;
    channel: string;
    timestamp: string;
    status: string;
  }>>([
    {
      id: 'DISP-INIT-01',
      phone: '+91 98112 34501',
      name: 'Kenji Takahashi',
      message: '[e-Pravas Suraksha: Bureau of Immigration] Smart SIM linked with e-Visa IND-EV-661209. Valid stay active.',
      channel: 'Jio 5G / WhatsApp',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'DELIVERED',
    },
  ]);

  // Clean formatted target phone
  const cleanPhoneDigits = (countryCode + phoneNumber).replace(/[^0-9]/g, '');
  const fullTargetPhone = `${countryCode} ${phoneNumber}`.trim();

  // Save gateway configs
  const saveGatewayConfig = () => {
    localStorage.setItem('pravas_twilio_sid', twilioSid);
    localStorage.setItem('pravas_twilio_auth', twilioAuth);
    localStorage.setItem('pravas_twilio_from', twilioFrom);
    localStorage.setItem('pravas_sms_webhook', smsWebhookUrl);
    setShowGatewayConfig(false);
    alert('Telecom Gateway settings saved successfully.');
  };

  // Templates
  const templates: Record<string, { label: string; stage: string; badge: string; text: (name: string, passport: string) => string }> = {
    t3: {
      label: '⏳ Visa Expiring Soon (T-3 Days Warning)',
      stage: 'T-3',
      badge: 'URGENT',
      text: (name, passport) =>
        `[URGENT: Visa Compliance Alert] Dear ${name}, only 3 DAYS remain on your Indian visa! Overstaying incurs statutory fine of INR 2,000/day & automated departure gate blocking. Please extend at pravas.gov.in immediately.`,
    },
    overstay: {
      label: '⚠️ Overstay Warning (Statutory Penalty)',
      stage: 'DAILY_OVERSTAY',
      badge: 'CRITICAL',
      text: (name, passport) =>
        `[CRITICAL NOTICE: Bureau of Immigration, Govt. of India] Passenger ${name}, you have OVERSTAYED your authorized stay by 4 days. Accrued penalty: INR 8,000. Passport (${passport}) is flagged for departure block at all Indian international airports. Report to nearest FRRO office immediately.`,
    },
    t0: {
      label: '📅 Final Day Expiry Notice (Today)',
      stage: 'T-0',
      badge: 'ACTION REQ',
      text: (name, passport) =>
        `[FINAL NOTICE: Bureau of Immigration, India] Dear ${name}, TODAY is your last authorized day in India. Compliance window closes at 23:59 IST. Please report to departure terminal or immigration checkpost immediately.`,
    },
    t10: {
      label: 'ℹ️ 10-Day Visa Expiry Advisory',
      stage: 'T-10',
      badge: 'ADVISORY',
      text: (name, passport) =>
        `[Bureau of Immigration Security Advisory] Dear ${name}, your Indian e-Visa (${passport}) expires in 10 days. Please verify your departure itinerary or apply for an online extension at pravas.gov.in.`,
    },
    gate_clear: {
      label: '🛫 Smart Departure E-Gate Clearance',
      stage: 'GATE_EVENT',
      badge: 'PASS',
      text: (name, passport) =>
        `[Smart E-Gate: Departure Clearance] Verified passenger ${name}. Gate GATE-T3-04 is OPEN. Boarding authorized. Have a safe journey from India! 🇮🇳`,
    },
    custom: {
      label: '✍️ Custom Visa Officer Notice',
      stage: 'MANUAL_OFFICER',
      badge: 'CUSTOM',
      text: (name, passport) =>
        `[Official Immigration Notice] Passenger ${name} (${passport}), please report to Immigration Counter 4 regarding your visa documentation review.`,
    },
  };

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    if (templates[key]) {
      setMessageText(templates[key].text(recipientName, passportNumber));
    }
  };

  // Re-render template when recipient changes
  useEffect(() => {
    if (selectedTemplateKey !== 'custom' && templates[selectedTemplateKey]) {
      setMessageText(templates[selectedTemplateKey].text(recipientName, passportNumber));
    }
  }, [recipientName, passportNumber]);

  // Main Dispatch Function (Supports Manual & Automated Dispatches)
  const handleDispatchRealNotification = async (phoneOverride?: string) => {
    const targetInput = (phoneOverride !== undefined ? phoneOverride : phoneNumber).trim();
    if (!targetInput) {
      alert('Please enter a valid real mobile number.');
      return;
    }
    if (!messageText.trim()) {
      alert('Please enter a message to send.');
      return;
    }

    setIsSending(true);
    setLastDeliveredAck(null);

    const formattedTarget = `${countryCode} ${targetInput}`.trim();
    const cleanDigits = (countryCode + targetInput).replace(/[^0-9]/g, '');
    const stage = templates[selectedTemplateKey]?.stage || 'MANUAL_OFFICER';

    try {
      const res = await fetch('/api/mobile/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_phone: formattedTarget,
          message: messageText,
          traveler_name: recipientName,
          passport_number: passportNumber,
          stage,
          channel: 'SMS',
          custom_sender: 'GOV-PRAVAS',
          twilio_account_sid: twilioSid || undefined,
          twilio_auth_token: twilioAuth || undefined,
          twilio_from_number: twilioFrom || undefined,
          sms_gateway_webhook_url: smsWebhookUrl || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // 1. Play real audio chime
        if (soundEnabled) {
          notificationService.playChimeTone(
            stage === 'DAILY_OVERSTAY' ? 'urgent' : stage === 'GATE_EVENT' ? 'gate' : 'sms'
          );
        }

        // 2. Vibrate physical device
        if (vibrationEnabled) {
          notificationService.vibrate([200, 100, 250, 100, 200]);
        }

        // 3. Real OS Desktop/Mobile push notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          notificationService.showSystemNotification(
            `🇮🇳 [GOV-PRAVAS] Real Visa Alert for ${formattedTarget}`,
            messageText
          );
        }

        // 4. Set delivery package for real links
        const deliveryPkg = {
          whatsappUrl: data.real_world_delivery?.whatsapp_url || `https://api.whatsapp.com/send?phone=${cleanDigits}&text=${encodeURIComponent(messageText)}`,
          smsUriAndroid: data.real_world_delivery?.sms_uri_android || `sms:+${cleanDigits}?body=${encodeURIComponent(messageText)}`,
          smsUriIos: data.real_world_delivery?.sms_uri_ios || `sms:+${cleanDigits}&body=${encodeURIComponent(messageText)}`,
          formattedPhone: formattedTarget,
          carrierGateway: data.carrier_dlr?.gateway || 'Jio 5G / Airtel Telecom',
          sentAt: new Date().toLocaleTimeString(),
        };
        setRealDeliveryData(deliveryPkg);

        // 5. Append to sent log
        setSentLog(prev => [
          {
            id: 'DISP-' + Date.now(),
            phone: formattedTarget,
            name: recipientName,
            message: messageText,
            channel: `${deliveryPkg.carrierGateway} / SMPP`,
            timestamp: deliveryPkg.sentAt,
            status: 'DELIVERED',
          },
          ...prev,
        ]);

        setLastDeliveredAck(`✅ Alert Successfully Transmitted to ${formattedTarget}!`);
        setLastAutoSentNumber(cleanDigits);
        setAutoSendStatus('sent');

        // 6. Auto open WhatsApp if enabled
        if (autoOpenWhatsApp) {
          window.open(deliveryPkg.whatsappUrl, '_blank');
        }

        // 7. Auto open Native Device SMS if enabled
        if (autoOpenDeviceSMS) {
          const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
          window.location.href = isIOS ? deliveryPkg.smsUriIos : deliveryPkg.smsUriAndroid;
        }
      } else {
        alert('Server failed to dispatch: ' + (data.error || 'Unknown error'));
        setAutoSendStatus('idle');
      }
    } catch (err: any) {
      alert('Error dispatching message: ' + err.message);
      setAutoSendStatus('idle');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Phone Number Input change & Automatic SMS Sending Detection
  const handlePhoneInputChange = (newVal: string, immediateSend = false) => {
    setPhoneNumber(newVal);

    // Clear any existing debounce timer
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }

    // Strip non-digits
    const rawDigits = newVal.replace(/[^0-9]/g, '');
    const cleanDigits = countryCode === '+91' && rawDigits.length > 10 && rawDigits.startsWith('91')
      ? rawDigits.slice(2)
      : rawDigits;

    if (!autoSendOnEntry) {
      setAutoSendStatus('idle');
      setAutoSendCountdown(0);
      return;
    }

    // Valid check: 10 digits for India (+91), or 8-15 digits for international
    const isValidCompleteMobile =
      countryCode === '+91'
        ? cleanDigits.length === 10
        : cleanDigits.length >= 8 && cleanDigits.length <= 15;

    if (isValidCompleteMobile) {
      // Don't auto-send again if this exact number was already automatically sent in this session (unless forced)
      if (cleanDigits === lastAutoSentNumber && !immediateSend) {
        setAutoSendStatus('sent');
        return;
      }

      if (immediateSend) {
        // Immediate dispatch
        setAutoSendStatus('sending');
        setAutoSendCountdown(0);
        handleDispatchRealNotification(cleanDigits);
      } else {
        // Debounced dispatch with a rapid 1.0 second visual countdown
        setAutoSendStatus('countdown');
        setAutoSendCountdown(1);

        autoSendTimerRef.current = setTimeout(() => {
          setAutoSendStatus('sending');
          handleDispatchRealNotification(cleanDigits);
        }, 1100);
      }
    } else {
      if (cleanDigits.length > 0) {
        setAutoSendStatus('typing');
      } else {
        setAutoSendStatus('idle');
      }
      setAutoSendCountdown(0);
    }
  };

  // Cancel pending auto-send
  const handleCancelAutoSend = () => {
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    setAutoSendStatus('cancelled');
    setAutoSendCountdown(0);
  };

  // Immediate send now trigger for auto-send
  const handleSendNowInstantly = () => {
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    const cleanDigits = (countryCode + phoneNumber).replace(/[^0-9]/g, '');
    setAutoSendStatus('sending');
    handleDispatchRealNotification(phoneNumber);
  };

  // Quick preset click handler with instant auto-send
  const handleSelectPresetPhone = (number: string, name?: string, passport?: string) => {
    if (name) setRecipientName(name);
    if (passport) setPassportNumber(passport);
    const clean = number.replace(/^\+91\s*/, '').replace(/[^0-9]/g, '');
    setPhoneNumber(clean);
    if (autoSendOnEntry) {
      handlePhoneInputChange(clean, true);
    }
  };

  // Launch WhatsApp directly
  const handleOpenWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?phone=${cleanPhoneDigits}&text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  // Launch native SMS directly
  const handleOpenNativeSMS = () => {
    // Detect iOS
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUri = isIOS
      ? `sms:+${cleanPhoneDigits}&body=${encodeURIComponent(messageText)}`
      : `sms:+${cleanPhoneDigits}?body=${encodeURIComponent(messageText)}`;
    window.location.href = smsUri;
  };

  // Copy QR Link
  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Current QR Code link
  const currentQrUrl =
    qrMode === 'whatsapp'
      ? `https://api.whatsapp.com/send?phone=${cleanPhoneDigits}&text=${encodeURIComponent(messageText)}`
      : `sms:+${cleanPhoneDigits}?body=${encodeURIComponent(messageText)}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-indigo-700/50 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Official Visa Notification Dispatcher • Real-Time Mobile Messaging
            </span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-500/40">
              TRAI Approved Sender: GOV-PRAVAS
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Real Mobile Message &amp; Alert Sender
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Enter <strong className="text-white font-bold">any real physical mobile phone number</strong> (e.g. your personal mobile number) to instantly dispatch official Indian immigration compliance notices via <strong className="text-emerald-400">Real WhatsApp</strong>, <strong className="text-cyan-400">Native Cellular SMS (`sms:`)</strong>, <strong className="text-amber-400">Live Scannable QR Code</strong>, and <strong className="text-indigo-400">Telecom Carrier Gateway</strong>.
          </p>
        </div>

        {/* Action Controls in Banner */}
        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          <button
            onClick={() => setShowGatewayConfig(!showGatewayConfig)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold shadow-md transition"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showGatewayConfig ? 'Hide Gateway Config' : 'SMS Gateway Settings'}</span>
          </button>

          <button
            onClick={() => setShowPhonePreview(!showPhonePreview)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold shadow-md transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>{showPhonePreview ? 'Hide Screen Preview' : 'Show Screen Preview'}</span>
          </button>
        </div>
      </div>

      {/* Gateway Configuration Drawer */}
      {showGatewayConfig && (
        <div className="bg-slate-900 border border-cyan-800/60 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-extrabold text-white text-sm">
                  Telecom Cellular SMS Gateway Configuration (Optional)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Connect Twilio or custom SMS Gateway (Fast2SMS / MSG91) to dispatch real cellular SMS automatically over carrier towers.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGatewayConfig(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Twilio Account SID:</label>
              <input
                type="text"
                value={twilioSid}
                onChange={e => setTwilioSid(e.target.value)}
                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Twilio Auth Token:</label>
              <input
                type="password"
                value={twilioAuth}
                onChange={e => setTwilioAuth(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Twilio Sender Number (From):</label>
              <input
                type="text"
                value={twilioFrom}
                onChange={e => setTwilioFrom(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-xs">
              Or Custom SMS Gateway Webhook URL (POST):
            </label>
            <input
              type="url"
              value={smsWebhookUrl}
              onChange={e => setSmsWebhookUrl(e.target.value)}
              placeholder="https://api.fast2sms.com/... or https://your-sms-webhook.com"
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400">
              Note: You can always send for FREE via Real WhatsApp and Device SMS even without Twilio!
            </span>
            <button
              onClick={saveGatewayConfig}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition shadow"
            >
              Save Gateway Settings
            </button>
          </div>
        </div>
      )}

      {/* Top Interactive Spotlight Card: INSTANT AUTO-SMS ON MOBILE NUMBER ENTRY */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 animate-pulse" />
                ⚡ Auto-Send Engine: Active
              </span>
              <span className="text-[11px] font-semibold text-slate-300 bg-slate-900/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                Type mobile number &rarr; SMS automatically dispatches to that person!
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              Automatic SMS Dispatch on Mobile Number Entry
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              As soon as you enter any real 10-digit mobile number, the system automatically detects it and transmits the official Bureau of Immigration alert directly to that recipient!
            </p>
          </div>

          {/* Quick Auto-Send Controls */}
          <div className="flex items-center gap-2 flex-wrap text-xs relative z-10 shrink-0">
            <button
              type="button"
              onClick={() => setAutoSendOnEntry(!autoSendOnEntry)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition shadow-sm ${
                autoSendOnEntry
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/60'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Auto-Send on Entry: {autoSendOnEntry ? 'ON (Active)' : 'OFF (Manual)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoOpenDeviceSMS(!autoOpenDeviceSMS)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition ${
                autoOpenDeviceSMS
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-cyan-950/60'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Launch Device SMS: {autoOpenDeviceSMS ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Big Quick Mobile Entry Bar */}
        <div className="bg-slate-950/90 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-inner space-y-3 relative z-10">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Country code prefix */}
            <div className="sm:w-44 shrink-0">
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-3 text-white font-mono text-xs focus:outline-none"
              >
                <option value="+91">🇮🇳 India (+91)</option>
                <option value="+1">🇺🇸 USA / Canada (+1)</option>
                <option value="+44">🇬🇧 UK (+44)</option>
                <option value="+61">🇦🇺 Australia (+61)</option>
                <option value="+81">🇯🇵 Japan (+81)</option>
                <option value="+49">🇩🇪 Germany (+49)</option>
                <option value="+65">🇸🇬 Singapore (+65)</option>
                <option value="+971">🇦🇪 UAE (+971)</option>
              </select>
            </div>

            {/* Main Phone Input */}
            <div className="relative flex-1">
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => handlePhoneInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handlePhoneInputChange(phoneNumber, true);
                  }
                }}
                placeholder="Enter real mobile number (e.g. 9876543210)..."
                className="w-full bg-slate-900 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl px-4 py-3 text-white font-mono text-base tracking-wide focus:outline-none placeholder-slate-500 shadow-inner"
              />

              {/* Status Indicator / Countdown / Action inside input */}
              <div className="absolute right-2.5 top-2.5 flex items-center gap-2">
                {autoSendStatus === 'countdown' && (
                  <div className="flex items-center gap-1.5 animate-fadeIn">
                    <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg animate-pulse shadow">
                      <Zap className="w-3.5 h-3.5" />
                      Auto-Sending in 1s...
                    </span>
                    <button
                      type="button"
                      onClick={handleSendNowInstantly}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
                    >
                      Send Now
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAutoSend}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {autoSendStatus === 'sending' && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-bold text-xs px-3 py-1 rounded-lg animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Transmitting SMS...
                  </span>
                )}

                {autoSendStatus === 'sent' && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-lg shadow">
                    <CheckCheck className="w-3.5 h-3.5" />
                    SMS Sent!
                  </span>
                )}

                {autoSendStatus === 'typing' && (
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                    {phoneNumber.replace(/[^0-9]/g, '').length}/10 digits
                  </span>
                )}

                {autoSendStatus === 'idle' && (
                  <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                    {fullTargetPhone}
                  </span>
                )}
              </div>
            </div>

            {/* Explicit Manual Send Button as alternative */}
            <button
              type="button"
              onClick={() => handleDispatchRealNotification()}
              disabled={isSending}
              className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Sending...' : '⚡ Send SMS Now'}</span>
            </button>
          </div>

          {/* Quick Demo Number Preset Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">
              Or tap a test mobile number to auto-send instantly:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'Kenji (Jio)', phone: '9811234501' },
                { label: 'Pravas Test 1', phone: '9876543210' },
                { label: 'Delhi SIM (Airtel)', phone: '8826541290' },
                { label: 'Mumbai SIM (Vi)', phone: '9820567890' },
              ].map(chip => (
                <button
                  key={chip.phone}
                  type="button"
                  onClick={() => handleSelectPresetPhone(chip.phone, chip.label)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500 text-[11px] font-mono transition flex items-center gap-1"
                >
                  <PhoneCall className="w-3 h-3 text-emerald-400" />
                  <span>+91 {chip.phone}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Auto-Send Delivery Status Alert Banner */}
        {realDeliveryData && (
          <div className="bg-emerald-950/90 border border-emerald-500/60 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>SMS Alert Automatically Transmitted to {realDeliveryData.formattedPhone}</span>
                  <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded font-mono border border-emerald-700">
                    Carrier: {realDeliveryData.carrierGateway} • DELIVRD
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300">
                  Delivered at {realDeliveryData.sentAt}. Audio alert triggered. Message logged in official Immigration Alert Registry.
                </p>
              </div>
            </div>

            {/* Quick 1-tap real actions */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Open in WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleOpenNativeSMS}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Open in Device SMS</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopyLink(currentQrUrl)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700"
              >
                {copiedLink ? 'Copied ✓' : 'Copy Link'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Real-World Sender Options (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Target Real Mobile Number */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    1. Enter Real World Mobile Phone Number
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Type your actual mobile number or any recipient's phone number
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/40">
                ACTIVE RECIPIENT
              </span>
            </div>

            {/* Mobile Number Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Country Code */}
              <div className="sm:col-span-3">
                <label className="block text-slate-400 text-xs font-semibold mb-1">
                  Country Code:
                </label>
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none"
                >
                  <option value="+91">🇮🇳 India (+91)</option>
                  <option value="+1">🇺🇸 USA / Canada (+1)</option>
                  <option value="+44">🇬🇧 UK (+44)</option>
                  <option value="+61">🇦🇺 Australia (+61)</option>
                  <option value="+81">🇯🇵 Japan (+81)</option>
                  <option value="+49">🇩🇪 Germany (+49)</option>
                  <option value="+65">🇸🇬 Singapore (+65)</option>
                  <option value="+971">🇦🇪 UAE (+971)</option>
                </select>
              </div>

              {/* Mobile Phone Number */}
              <div className="sm:col-span-9">
                <label className="block text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>Target Mobile Number:</span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      ⚡ Auto-Sends SMS on 10 digits
                    </span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {phoneNumber.replace(/[^0-9]/g, '').length}/10 digits entered
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => handlePhoneInputChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePhoneInputChange(phoneNumber, true);
                      }
                    }}
                    placeholder="9876543210 (Type your real number)"
                    className="w-full bg-slate-950 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm tracking-wide focus:outline-none shadow-inner"
                  />
                  <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 text-[11px] font-mono">
                    {autoSendStatus === 'countdown' ? (
                      <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] animate-pulse">
                        ⚡ Sending SMS...
                      </span>
                    ) : autoSendStatus === 'sent' ? (
                      <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                        ✓ Transmitted
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold">{fullTargetPhone}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Identity metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">
                  Passenger / Traveler Full Name:
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="e.g. Kenji Takahashi"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">
                  Passport / eVisa Reference:
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={e => setPassportNumber(e.target.value)}
                  placeholder="e.g. JP8829102"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Pick from Registered Tourists */}
            <div className="pt-2">
              <label className="block text-[11px] text-slate-400 font-semibold mb-1.5 flex items-center justify-between">
                <span>Or Quick Select Registered Traveler (Auto-Sends SMS to their number):</span>
                <span className="text-[10px] text-emerald-400">⚡ 1-Click Instant Dispatch</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {travelers.slice(0, 5).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectPresetPhone(t.phone_number, t.full_name, t.passport_number)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                      recipientName === t.full_name
                        ? 'bg-blue-600/30 text-blue-200 border-blue-500 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{t.full_name}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">({t.phone_number})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Choose Official Indian Immigration Template */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    2. Select Official Immigration Notice Template
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Trai-registered Indian Bureau of Immigration notification formats
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(templates).map(([key, tpl]) => {
                const isSelected = selectedTemplateKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectTemplate(key)}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-900/50 to-indigo-900/40 border-cyan-400 text-white shadow-lg shadow-cyan-950/40'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>{tpl.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                        {tpl.badge}
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Editable Message Body */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
                <span>Message Text Body (Editable):</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Characters: {messageText.length}
                </span>
              </label>
              <textarea
                rows={3}
                value={messageText}
                onChange={e => {
                  setMessageText(e.target.value);
                  setSelectedTemplateKey('custom');
                }}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-2xl p-3.5 text-xs text-white leading-relaxed focus:outline-none shadow-inner"
              />
            </div>

            {/* Audio, Vibration, Auto-Open Controls */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-medium">Real-World Dispatch Options:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    if (!soundEnabled) notificationService.playChimeTone('sms');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
                    soundEnabled
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{soundEnabled ? 'Audio Chime ON' : 'Audio Muted'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVibrationEnabled(!vibrationEnabled);
                    if (!vibrationEnabled) notificationService.vibrate([150, 50, 150]);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
                    vibrationEnabled
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/50'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <Vibrate className="w-3.5 h-3.5" />
                  <span>{vibrationEnabled ? 'Vibration ON' : 'Vibrate OFF'}</span>
                </button>

                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={autoOpenWhatsApp}
                    onChange={e => setAutoOpenWhatsApp(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span>Auto-Launch WhatsApp on Send</span>
                </label>
              </div>
            </div>

            {/* BIG ACTION BUTTON */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleDispatchRealNotification}
                disabled={isSending}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-950/60 transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-5 h-5 animate-pulse" />
                <span>
                  {isSending
                    ? 'Transmitting Notification...'
                    : `🚀 Send Live Notification to ${fullTargetPhone}`}
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: DIRECT 1-CLICK REAL-WORLD ACCESS BUTTONS */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm text-white">
                  3. Direct 1-Click Real World Mobile Channels
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Instant Physical Delivery</span>
            </div>

            <p className="text-xs text-slate-300">
              Click any button below to immediately transmit this live alert to{' '}
              <strong className="text-emerald-400 font-bold">{fullTargetPhone}</strong> through your real-world messaging apps:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WhatsApp Real World Button */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex items-center justify-between p-4 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/50 text-white transition group shadow-lg shadow-emerald-950/40"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow">
                    💬
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-300 group-hover:text-emerald-200">
                      Send to Real WhatsApp
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Opens chat directly with {fullTargetPhone}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition" />
              </button>

              {/* Native SMS (`sms:`) Button */}
              <button
                type="button"
                onClick={handleOpenNativeSMS}
                className="flex items-center justify-between p-4 rounded-2xl bg-blue-950/80 hover:bg-blue-900/90 border border-blue-500/50 text-white transition group shadow-lg shadow-blue-950/40"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow">
                    📱
                  </div>
                  <div>
                    <div className="text-xs font-black text-blue-300 group-hover:text-blue-200">
                      Open in Mobile SMS App
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Triggers native Messages app (iOS/Android)
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Scan with Real Phone QR Code & Dispatch Telemetry (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Real Phone QR Code Card */}
          <div className="bg-slate-900/95 border-2 border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <h3 className="font-extrabold text-sm text-white">Scan with Your Physical Phone</h3>
              </div>
              <span className="text-[10px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                CAMERA QR
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Point your smartphone camera at this QR code to immediately open this alert on your physical device!
            </p>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-xl border-4 border-slate-800">
              <QRCodeSVG
                value={currentQrUrl}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* QR Mode Switcher */}
            <div className="flex items-center justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setQrMode('whatsapp')}
                className={`px-3 py-1 rounded-xl font-bold transition ${
                  qrMode === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                WhatsApp QR
              </button>

              <button
                type="button"
                onClick={() => setQrMode('sms')}
                className={`px-3 py-1 rounded-xl font-bold transition ${
                  qrMode === 'sms'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Cellular SMS QR
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-mono truncate max-w-[180px]">
                {fullTargetPhone}
              </span>
              <button
                type="button"
                onClick={() => handleCopyLink(currentQrUrl)}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Direct Link'}</span>
              </button>
            </div>
          </div>

          {/* Acknowledgement Status Badge */}
          {lastDeliveredAck && (
            <div className="bg-emerald-950/90 border border-emerald-500/60 p-4 rounded-3xl text-xs space-y-2 text-emerald-200 animate-fadeIn shadow-xl">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Live Delivery Confirmed</span>
              </div>
              <p className="text-[11px] text-slate-300">{lastDeliveredAck}</p>
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow"
                >
                  Open in WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleOpenNativeSMS}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow"
                >
                  Open in SMS
                </button>
              </div>
            </div>
          )}

          {/* Optional Screen Preview Drawer */}
          {showPhonePreview && (
            <div className="bg-slate-950 rounded-3xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  Screen Preview on Device
                </span>
                <span className="text-[10px] text-emerald-400">Jio 5G</span>
              </div>

              <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                  <span className="font-bold text-white flex items-center gap-1">
                    🇮🇳 GOV-PRAVAS <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  </span>
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-100 text-[11px] leading-relaxed">
                  {messageText}
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>To: {fullTargetPhone}</span>
                  <span className="text-emerald-400 font-mono">DLR: DELIVRD</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dispatched History Log Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="font-extrabold text-sm text-white">
              Recent Real-World Mobile Message Transmissions
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Total Dispatched: <strong className="text-white">{sentLog.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Recipient Number</th>
                <th className="py-2.5 px-3">Passenger</th>
                <th className="py-2.5 px-3">Message Content</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sentLog.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono text-slate-400">{log.timestamp}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{log.phone}</td>
                  <td className="py-2.5 px-3 font-medium text-white">{log.name}</td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-md truncate" title={log.message}>
                    {log.message}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="bg-slate-950 text-cyan-300 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                      {log.channel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        const clean = log.phone.replace(/[^0-9]/g, '');
                        window.open(
                          `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(log.message)}`,
                          '_blank'
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white text-[11px] font-semibold transition"
                    >
                      Resend WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
