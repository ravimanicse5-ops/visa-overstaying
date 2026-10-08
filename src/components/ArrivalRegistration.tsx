import React, { useState, useRef } from 'react';
import { Traveler } from '../types';
import { notificationService } from '../utils/notificationAudio';
import {
  UserPlus,
  CreditCard,
  CheckCircle,
  Sparkles,
  Plane,
  Radio,
  FileCheck,
  AlertCircle,
  MapPin,
  QrCode,
  Smartphone,
  Send,
  Share2,
  Zap,
  CheckCheck,
  Loader2,
} from 'lucide-react';

interface ArrivalRegistrationProps {
  onSuccess: (newTraveler: Traveler) => void;
  onOpenTouristPass: (travelerId: string) => void;
}

export const ArrivalRegistration: React.FC<ArrivalRegistrationProps> = ({
  onSuccess,
  onOpenTouristPass,
}) => {
  const [fullName, setFullName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [nationality, setNationality] = useState('United States');
  const [entryPort, setEntryPort] = useState('DEL - Indira Gandhi Intl, New Delhi');
  const [evisaNumber, setEvisaNumber] = useState('');
  const [visaIssueDate, setVisaIssueDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  // Default expiry: 30 days ahead
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);
  const [visaExpiryDate, setVisaExpiryDate] = useState(
    defaultExpiry.toISOString().split('T')[0]
  );
  const [esimId, setEsimId] = useState(`ESIM-AIRTEL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [phoneNumber, setPhoneNumber] = useState('+91 98110 ');
  const [email, setEmail] = useState('');
  const [lastLatitude, setLastLatitude] = useState(28.5562);
  const [lastLongitude, setLastLongitude] = useState(77.1000);

  // Auto-Send SMS on Mobile Number Entry
  const [autoSendSmsOnEntry, setAutoSendSmsOnEntry] = useState<boolean>(true);
  const [autoSmsStatus, setAutoSmsStatus] = useState<'idle' | 'typing' | 'countdown' | 'sending' | 'sent'>('idle');
  const [lastAutoSentNumber, setLastAutoSentNumber] = useState<string | null>(null);
  const [autoSmsAck, setAutoSmsAck] = useState<string | null>(null);
  const autoSmsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTraveler, setCreatedTraveler] = useState<Traveler | null>(null);

  // Quick Presets for Demo
  const applyPreset = (type: 'valid_tourist' | 'short_stay' | 'urgent_trip') => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const today = new Date();

    if (type === 'valid_tourist') {
      setFullName('Emily Watson');
      setPassportNumber(`US${randomSuffix}90`);
      setNationality('United States');
      setEntryPort('DEL - Indira Gandhi Intl, New Delhi');
      setEvisaNumber(`IND-EV-${randomSuffix}`);
      setEsimId(`ESIM-AIRTEL-${randomSuffix}`);
      setPhoneNumber(`+91 98114 ${randomSuffix}`);
      setEmail(`emily.watson${randomSuffix}@nymail.com`);
      const exp = new Date(today);
      exp.setDate(exp.getDate() + 30);
      setVisaExpiryDate(exp.toISOString().split('T')[0]);
    } else if (type === 'short_stay') {
      setFullName('Marco Bellini');
      setPassportNumber(`IT${randomSuffix}12`);
      setNationality('Italy');
      setEntryPort('BOM - Chhatrapati Shivaji, Mumbai');
      setEvisaNumber(`IND-EV-${randomSuffix}`);
      setEsimId(`ESIM-JIO-${randomSuffix}`);
      setPhoneNumber(`+91 98205 ${randomSuffix}`);
      setEmail(`marco.bellini${randomSuffix}@romamail.it`);
      const exp = new Date(today);
      exp.setDate(exp.getDate() + 5); // 5 days left -> triggers T-3/T-0 soon
      setVisaExpiryDate(exp.toISOString().split('T')[0]);
    } else {
      setFullName('Ananya Verma (Overseas)');
      setPassportNumber(`SG${randomSuffix}77`);
      setNationality('Singapore');
      setEntryPort('BLR - Kempegowda Intl, Bengaluru');
      setEvisaNumber(`IND-EV-${randomSuffix}`);
      setEsimId(`ESIM-VI-${randomSuffix}`);
      setPhoneNumber(`+91 98452 ${randomSuffix}`);
      setEmail(`ananya.sg${randomSuffix}@singnet.sg`);
      const exp = new Date(today);
      exp.setDate(exp.getDate() + 60);
      setVisaExpiryDate(exp.toISOString().split('T')[0]);
    }
  };

  // Dispatch Welcome SMS automatically upon phone number entry
  const dispatchAutoArrivalSms = async (targetPhone: string) => {
    const clean = targetPhone.replace(/[^0-9]/g, '');
    if (clean.length < 10) return;
    setAutoSmsStatus('sending');

    const formattedTarget = targetPhone.startsWith('+') ? targetPhone : `+91 ${targetPhone}`;
    const welcomeMsg = `[e-Pravas Suraksha: Bureau of Immigration] Welcome to India, ${fullName || 'Passenger'}! Smart SIM (${esimId}) linked with Indian eVisa (${evisaNumber || 'Active'}). Valid stay authorized. Live departure assistance active at pravas.gov.in.`;

    try {
      const res = await fetch('/api/mobile/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_phone: formattedTarget,
          message: welcomeMsg,
          traveler_name: fullName || 'Passenger',
          passport_number: passportNumber || 'INDIAN-EV',
          stage: 'ONBOARDING',
          channel: 'SMS',
          custom_sender: 'GOV-PRAVAS',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notificationService.playChimeTone('sms');
        notificationService.vibrate([150, 80, 150]);
        setAutoSmsAck(`✅ Welcome SMS Automatically Transmitted to ${formattedTarget}!`);
        setLastAutoSentNumber(clean);
        setAutoSmsStatus('sent');
      } else {
        setAutoSmsStatus('idle');
      }
    } catch (err) {
      setAutoSmsStatus('idle');
    }
  };

  const handlePhoneChange = (newVal: string, immediate = false) => {
    setPhoneNumber(newVal);
    if (autoSmsTimerRef.current) {
      clearTimeout(autoSmsTimerRef.current);
      autoSmsTimerRef.current = null;
    }

    if (!autoSendSmsOnEntry) {
      setAutoSmsStatus('idle');
      return;
    }

    const clean = newVal.replace(/[^0-9]/g, '');
    const is10Digit = clean.length === 10 || (clean.length === 12 && clean.startsWith('91'));

    if (is10Digit) {
      if (clean === lastAutoSentNumber && !immediate) {
        setAutoSmsStatus('sent');
        return;
      }

      if (immediate) {
        dispatchAutoArrivalSms(newVal);
      } else {
        setAutoSmsStatus('countdown');
        autoSmsTimerRef.current = setTimeout(() => {
          dispatchAutoArrivalSms(newVal);
        }, 1100);
      }
    } else {
      setAutoSmsStatus(clean.length > 4 ? 'typing' : 'idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/travelers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          passport_number: passportNumber,
          nationality,
          entry_port: entryPort,
          evisa_number: evisaNumber,
          visa_issue_date: visaIssueDate,
          visa_expiry_date: visaExpiryDate,
          esim_id: esimId,
          phone_number: phoneNumber,
          email,
          last_latitude: lastLatitude,
          last_longitude: lastLongitude,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedTraveler(data.traveler);
        onSuccess(data.traveler);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network connection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-cyan-950 p-6 rounded-2xl border border-blue-800/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
            <Radio className="w-4 h-4 animate-pulse" />
            Module 1: Arrival Registration &amp; Smart SIM Identity Linking
          </div>
          <h2 className="text-xl font-bold text-white">Traveler Arrival Registration: Tourist &amp; Smart SIM Onboarding</h2>
          <p className="text-xs text-slate-300">
            Bureau of Immigration, Govt. of India • Links electronic visa (e-Visa) records to provisioned Indian Smart SIM telecom profiles at airport immigration counters.
          </p>
        </div>

        {/* Quick Demo Autofill Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium">Autofill Demo Profile:</span>
          <button
            type="button"
            onClick={() => applyPreset('valid_tourist')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-medium transition"
          >
            US Tourist (30d)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('short_stay')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-medium transition"
          >
            EU Tourist (5d Soon)
          </button>
        </div>
      </div>

      {/* Success Notification Box */}
      {createdTraveler && (
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-5 shadow-lg animate-fadeIn flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Traveler Onboarded &amp; Monitoring Activated!</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full border border-emerald-500/30">
                  {createdTraveler.id}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Linked Smart SIM <span className="font-mono text-emerald-300 font-bold">{createdTraveler.esim_id}</span>{' '}
                to e-Visa <span className="font-mono text-cyan-300">{createdTraveler.evisa_number}</span>. Welcome SMS
                alert dispatched.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                const clean = createdTraveler.phone_number.replace(/[^0-9]/g, '');
                const msg = `[e-Pravas Suraksha: Bureau of Immigration, Govt. of India] Welcome to India, ${createdTraveler.full_name}! Smart SIM ${createdTraveler.esim_id} linked with eVisa ${createdTraveler.evisa_number}. Authorized stay until ${createdTraveler.visa_expiry_date}. Official pass: pravas.gov.in`;
                window.open(`https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              title="Send real welcome message to passenger's mobile via WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>Send WhatsApp to {createdTraveler.phone_number}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenTouristPass(createdTraveler.id)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
            >
              <QrCode className="w-4 h-4" />
              <span>View Digital Pass</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Passenger Information */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <span>1. Passenger Demographics &amp; Travel Document</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Full Name (as in Passport) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Liam Hemsworth-Miller"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Passport Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. AU3391055"
                value={passportNumber}
                onChange={e => setPassportNumber(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nationality *</label>
              <select
                value={nationality}
                onChange={e => setNationality(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Japan">Japan</option>
                <option value="Singapore">Singapore</option>
                <option value="Canada">Canada</option>
                <option value="Spain">Spain</option>
                <option value="Brazil">Brazil</option>
                <option value="Italy">Italy</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: e-Visa Authorization Details */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <span>2. Electronic Visa (e-Visa) Clearance</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">e-Visa Application Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. IND-EV-982741"
                value={evisaNumber}
                onChange={e => setEvisaNumber(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Visa Issue Date *</label>
              <input
                type="date"
                required
                value={visaIssueDate}
                onChange={e => setVisaIssueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Visa Expiry Date (Valid Until) *</label>
              <input
                type="date"
                required
                value={visaExpiryDate}
                onChange={e => setVisaExpiryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold text-amber-300"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">Immigration Entry Port</label>
              <select
                value={entryPort}
                onChange={e => setEntryPort(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="DEL - Indira Gandhi Intl, New Delhi">DEL - Indira Gandhi Intl, New Delhi</option>
                <option value="BOM - Chhatrapati Shivaji, Mumbai">BOM - Chhatrapati Shivaji, Mumbai</option>
                <option value="BLR - Kempegowda Intl, Bengaluru">BLR - Kempegowda Intl, Bengaluru</option>
                <option value="MAA - Chennai Intl">MAA - Chennai Intl</option>
                <option value="GOI - Goa Dabolim Intl">GOI - Goa Dabolim Intl</option>
                <option value="HYD - Rajiv Gandhi Intl, Hyderabad">HYD - Rajiv Gandhi Intl, Hyderabad</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Smart SIM Identity & Contact Telemetry */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>3. Provisioned Smart SIM / eSIM Linking Profile</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Smart SIM / eSIM Profile ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. ESIM-AIRTEL-9901"
                value={esimId}
                onChange={e => setEsimId(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 font-semibold placeholder-slate-600 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
                <span>Tourist Local Phone Number *</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {phoneNumber.replace(/[^0-9]/g, '').length >= 10 ? '✓ 10 Digits Complete' : `${phoneNumber.replace(/[^0-9]/g, '').length}/10 digits`}
                </span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="+91 98112 34501"
                  value={phoneNumber}
                  onChange={e => handlePhoneChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handlePhoneChange(phoneNumber, true);
                    }
                  }}
                  className="w-full bg-slate-950 border-2 border-emerald-500/50 focus:border-emerald-400 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
                <div className="absolute right-2 top-2">
                  {autoSmsStatus === 'countdown' && (
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                      ⚡ Sending SMS in 1s...
                    </span>
                  )}
                  {autoSmsStatus === 'sending' && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Sending...
                    </span>
                  )}
                  {autoSmsStatus === 'sent' && (
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CheckCheck className="w-2.5 h-2.5" />
                      SMS Sent!
                    </span>
                  )}
                </div>
              </div>

              {/* Auto-Send on entry checkbox */}
              <div className="mt-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSendSmsOnEntry}
                    onChange={e => setAutoSendSmsOnEntry(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span>⚡ Auto-send SMS to person when entered</span>
                </label>
                {autoSmsStatus === 'sent' && (
                  <button
                    type="button"
                    onClick={() => {
                      const clean = phoneNumber.replace(/[^0-9]/g, '');
                      window.open(`https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(`[e-Pravas Suraksha] Welcome to India!`)}`, '_blank');
                    }}
                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                  >
                    Open WhatsApp &rarr;
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="tourist@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Registering & Linking Profile...' : 'Complete Onboarding & Activate Tracking'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
