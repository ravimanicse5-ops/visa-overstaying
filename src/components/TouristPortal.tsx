import React, { useState, useEffect } from 'react';
import { Traveler, VisaExtension, Alert } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { notificationService } from '../utils/notificationAudio';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  IndianRupee,
  MapPin,
  FilePlus,
  Send,
  ShieldAlert,
  Calendar,
  Radio,
  Download,
  Share2,
  HelpCircle,
  ExternalLink,
  Smartphone,
} from 'lucide-react';

interface TouristPortalProps {
  travelers: Traveler[];
  selectedTravelerId: string | null;
  onSelectTraveler: (id: string) => void;
  onExtensionSubmitted: (ext: VisaExtension) => void;
  onNavigateTab?: (tab: string) => void;
}

export const TouristPortal: React.FC<TouristPortalProps> = ({
  travelers,
  selectedTravelerId,
  onSelectTraveler,
  onExtensionSubmitted,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedTraveler, setSearchedTraveler] = useState<Traveler | null>(null);
  const [passSentAlert, setPassSentAlert] = useState<string | null>(null);

  // Extension Form State
  const [extensionDays, setExtensionDays] = useState(14);
  const [extensionReason, setExtensionReason] = useState('');
  const [docFile, setDocFile] = useState('Medical_Summary_MaxSaket.pdf');
  const [isSubmittingExt, setIsSubmittingExt] = useState(false);
  const [extSuccessMessage, setExtSuccessMessage] = useState<string | null>(null);

  // Geofence Simulation State
  const [customLat, setCustomLat] = useState<number>(28.5562);
  const [customLng, setCustomLng] = useState<number>(77.1000);
  const [geofenceResult, setGeofenceResult] = useState<{
    distanceKm: number;
    isInsideAirportGeofence: boolean;
    geofenceStatus: string;
    evaluatedLocation: string;
  } | null>(null);
  const [isEvaluatingGeofence, setIsEvaluatingGeofence] = useState(false);

  // Sync selected traveler from props
  useEffect(() => {
    if (selectedTravelerId) {
      const found = travelers.find(t => t.id === selectedTravelerId);
      if (found) {
        setSearchedTraveler(found);
        setCustomLat(found.last_latitude);
        setCustomLng(found.last_longitude);
      }
    } else if (!searchedTraveler && travelers.length > 0) {
      // Default to first traveler (e.g. Liam overstayed or Sarah valid)
      setSearchedTraveler(travelers[0]);
      setCustomLat(travelers[0].last_latitude);
      setCustomLng(travelers[0].last_longitude);
    }
  }, [selectedTravelerId, travelers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = searchQuery.trim().toUpperCase();
    const found = travelers.find(
      t =>
        t.passport_number.toUpperCase() === q ||
        t.esim_id.toUpperCase() === q ||
        t.evisa_number.toUpperCase() === q ||
        t.id.toUpperCase() === q
    );

    if (found) {
      setSearchedTraveler(found);
      onSelectTraveler(found.id);
      setCustomLat(found.last_latitude);
      setCustomLng(found.last_longitude);
      setGeofenceResult(null);
    } else {
      alert(`No active tourist record found for "${searchQuery}". Try passport AU3391055 or GB7718290.`);
    }
  };

  const handleSendPassToMobile = async () => {
    if (!searchedTraveler) return;
    const msg = `[Traveler Digital Visa Pass: Bureau of Immigration] Verified Passenger ${searchedTraveler.full_name} (${searchedTraveler.passport_number}). Validity: until ${searchedTraveler.visa_expiry_date}. Status: ${searchedTraveler.status.toUpperCase()}. Airport departure gate ready.`;

    try {
      const res = await fetch('/api/mobile/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_phone: searchedTraveler.phone_number,
          message: msg,
          traveler_name: searchedTraveler.full_name,
          passport_number: searchedTraveler.passport_number,
          stage: 'MANUAL_OFFICER',
          channel: 'SMS',
          custom_sender: 'GOV-PRAVAS',
        }),
      });

      if (res.ok) {
        notificationService.playChimeTone('sms');
        notificationService.vibrate([200, 100, 200]);
        notificationService.showSystemNotification(
          `🇮🇳 [GOV-PRAVAS] Pass Alert Sent to ${searchedTraveler.full_name}`,
          msg
        );
        setPassSentAlert(`Live message alert delivered to ${searchedTraveler.phone_number}!`);
        setTimeout(() => setPassSentAlert(null), 5000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openWhatsAppPass = () => {
    if (!searchedTraveler) return;
    const cleanPhone = searchedTraveler.phone_number.replace(/[^0-9]/g, '');
    const msg = `[Traveler Digital Visa Pass: Bureau of Immigration] Passenger ${searchedTraveler.full_name} (${searchedTraveler.passport_number}). Status: ${searchedTraveler.status.toUpperCase()}, Expiry: ${searchedTraveler.visa_expiry_date}. Verified by Govt. of India.`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedTraveler) return;

    setIsSubmittingExt(true);
    setExtSuccessMessage(null);

    try {
      const res = await fetch('/api/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traveler_id: searchedTraveler.id,
          requested_days: extensionDays,
          reason: extensionReason,
          document_url: `https://e-frro.gov.in/docs/${docFile}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setExtSuccessMessage(`Visa extension application #${data.extension.id} submitted for review by FRRO Authority.`);
        onExtensionSubmitted(data.extension);
        setExtensionReason('');
      }
    } catch (err: any) {
      alert('Failed to submit extension application: ' + err.message);
    } finally {
      setIsSubmittingExt(false);
    }
  };

  const testGeofence = async (lat: number, lng: number, locName: string) => {
    if (!searchedTraveler) return;
    setIsEvaluatingGeofence(true);

    try {
      const res = await fetch(`/api/travelers/${searchedTraveler.id}/geofence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          location_name: locName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGeofenceResult({
          distanceKm: data.distanceKm,
          isInsideAirportGeofence: data.isInsideAirportGeofence,
          geofenceStatus: data.geofenceStatus,
          evaluatedLocation: locName,
        });
        setCustomLat(lat);
        setCustomLng(lng);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsEvaluatingGeofence(false);
    }
  };

  const qrPayload = searchedTraveler
    ? JSON.stringify({
        schema: 'e-FRRO-ProActive-v2',
        id: searchedTraveler.id,
        passport: searchedTraveler.passport_number,
        name: searchedTraveler.full_name,
        evisa: searchedTraveler.evisa_number,
        esim: searchedTraveler.esim_id,
        expiry: searchedTraveler.visa_expiry_date,
        status: searchedTraveler.status,
        flag: searchedTraveler.is_flagged,
        issuedBy: 'Govt. of India e-Pravas Suraksha (Bureau of Immigration)',
      })
    : '';

  return (
    <div className="space-y-6">
      {/* Top Search & Quick Select Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Enter Passport No (e.g. AU3391055) or eSIM ID (ESIM-AIRTEL-9905)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl shadow-md transition"
          >
            Lookup Pass
          </button>
        </form>

        {/* Quick Tourist Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">Demo Profiles:</span>
          {travelers.slice(0, 5).map(t => (
            <button
              key={t.id}
              onClick={() => {
                setSearchedTraveler(t);
                onSelectTraveler(t.id);
                setCustomLat(t.last_latitude);
                setCustomLng(t.last_longitude);
                setGeofenceResult(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap border transition ${
                searchedTraveler?.id === t.id
                  ? 'bg-blue-600/30 text-cyan-300 border-cyan-500 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {t.full_name.split(' ')[0]} ({t.status})
            </button>
          ))}
        </div>
      </div>

      {/* Main Tourist Pass & Breakdown View */}
      {searchedTraveler ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: The Scannable Digital Tourist Pass Card (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              {/* Top Pass Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                    IND
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Traveler Digital Visa Pass</h3>
                    <p className="text-[10px] text-slate-400">Bureau of Immigration, Govt. of India</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      searchedTraveler.status === 'valid'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : searchedTraveler.status === 'expiring_soon'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : searchedTraveler.status === 'overstayed'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {searchedTraveler.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="my-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner">
                <QRCodeSVG
                  value={qrPayload}
                  size={190}
                  level="H"
                  includeMargin={true}
                />
                <div className="text-slate-800 text-[10px] font-mono mt-1 text-center font-bold">
                  PASS ID: {searchedTraveler.id} • {searchedTraveler.passport_number}
                </div>
              </div>

              {/* Passenger Metadata Details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Full Name</span>
                  <span className="font-bold text-white text-sm">{searchedTraveler.full_name}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Passport Number</span>
                  <span className="font-mono text-cyan-300 font-bold">{searchedTraveler.passport_number}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Nationality</span>
                  <span className="text-slate-200">{searchedTraveler.nationality}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">e-Visa Application</span>
                  <span className="font-mono text-white">{searchedTraveler.evisa_number}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Linked Smart SIM</span>
                  <span className="font-mono text-emerald-400 font-semibold">{searchedTraveler.esim_id}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Authorized Expiry</span>
                  <span className="font-semibold text-amber-300">{searchedTraveler.visa_expiry_date}</span>
                </div>
              </div>

              {/* Live Alert Confirmation Toast */}
              {passSentAlert && (
                <div className="mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] rounded-xl flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{passSentAlert}</span>
                </div>
              )}

              {/* Direct Mobile Message Action Buttons */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendPassToMobile}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                  title="Send live mobile alert to passenger device"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Send to Mobile</span>
                </button>

                <button
                  type="button"
                  onClick={openWhatsAppPass}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                  title="Open pass status in WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>

              {/* Security Seal Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Departure E-Gate Ready</span>
                </div>
                <span>Bureau of Immigration, Govt. of India</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Compliance Breakdown, Extensions & Geo-Fencing (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Fine & Overstay Status Card */}
            <div
              className={`p-5 rounded-2xl border ${
                searchedTraveler.status === 'overstayed'
                  ? 'bg-rose-950/30 border-rose-800/60'
                  : searchedTraveler.status === 'expiring_soon'
                  ? 'bg-amber-950/30 border-amber-800/60'
                  : 'bg-emerald-950/30 border-emerald-800/60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {searchedTraveler.status === 'overstayed' ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                        <span>Immigration Compliance Violation: Overstay Detected</span>
                      </>
                    ) : searchedTraveler.status === 'expiring_soon' ? (
                      <>
                        <Clock className="w-5 h-5 text-amber-400" />
                        <span>Visa Expiry Warning Approaching</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Authorized Lawful Stay in India</span>
                      </>
                    )}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {searchedTraveler.status === 'overstayed'
                      ? `Your visa expired on ${searchedTraveler.visa_expiry_date}. You have accrued ${searchedTraveler.overstay_days} days of unauthorized stay. E-Gate exit is currently blocked until fine settlement.`
                      : searchedTraveler.status === 'expiring_soon'
                      ? `Your visa expires on ${searchedTraveler.visa_expiry_date}. Please depart India or submit an extension application below prior to the 23:59 IST deadline.`
                      : `Your visa is active and valid until ${searchedTraveler.visa_expiry_date}. You may depart via automated airport E-Gates seamlessly.`}
                  </p>
                </div>

                {searchedTraveler.fine_amount > 0 && (
                  <div className="text-right bg-slate-900/90 p-3 rounded-xl border border-rose-800/40 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Accrued Penalty Fine</span>
                    <span className="text-xl font-extrabold text-rose-400 flex items-center justify-end gap-0.5">
                      <IndianRupee className="w-4 h-4" />
                      {searchedTraveler.fine_amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-400">(₹2,000 / day)</span>
                  </div>
                )}
              </div>

              {searchedTraveler.resolution_notes && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-cyan-300 bg-slate-900/50 p-2.5 rounded-lg">
                  <span className="font-semibold text-white">Officer Resolution Note:</span>{' '}
                  {searchedTraveler.resolution_notes}
                </div>
              )}
            </div>

            {/* Visa Extension Application Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FilePlus className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Submit Visa Extension Application
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400">e-FRRO Section 14B</span>
              </div>

              {extSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{extSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleExtensionSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Extension Duration Requested</label>
                    <select
                      value={extensionDays}
                      onChange={e => setExtensionDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value={7}>+7 Days (Short Extension)</option>
                      <option value={14}>+14 Days (Standard Medical / Tourism)</option>
                      <option value={30}>+30 Days (Extended Hospitalization / Business)</option>
                      <option value={60}>+60 Days (Exceptional Circumstances)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Supporting Document File</label>
                    <input
                      type="text"
                      value={docFile}
                      onChange={e => setDocFile(e.target.value)}
                      placeholder="e.g. Hospital_Admit_Receipt.pdf"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Justification &amp; Ground for Extension</label>
                  <textarea
                    rows={2}
                    required
                    value={extensionReason}
                    onChange={e => setExtensionReason(e.target.value)}
                    placeholder="Provide authentic justification reason (e.g., ongoing post-operative medical checkup, delayed return charter flight, etc.)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingExt}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingExt ? 'Submitting Application...' : 'Submit Extension Request'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Simulated GPS Geo-Fencing Interactive Widget */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Simulated GPS Geo-Fencing Surveillance
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400">Airport Perimeter Boundary Test</span>
              </div>

              <p className="text-xs text-slate-300">
                Tests if an overstayed passenger's location coordinates indicate they are within the designated airport departure zone (≤ 5km) or in the general city perimeter.
              </p>

              {/* Preset Test Coordinate Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isEvaluatingGeofence}
                  onClick={() => testGeofence(28.5562, 77.1000, 'IGI Airport Terminal 3, New Delhi')}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition"
                >
                  <div className="text-xs font-semibold text-emerald-400">At Delhi Airport (T3)</div>
                  <div className="text-[10px] text-slate-400">Lat: 28.5562, Lng: 77.1000 (Inside Zone)</div>
                </button>

                <button
                  type="button"
                  disabled={isEvaluatingGeofence}
                  onClick={() => testGeofence(28.6328, 77.2197, 'Connaught Place, Central Delhi')}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition"
                >
                  <div className="text-xs font-semibold text-amber-400">Connaught Place (18km)</div>
                  <div className="text-[10px] text-slate-400">Lat: 28.6328, Lng: 77.2197 (City Center)</div>
                </button>

                <button
                  type="button"
                  disabled={isEvaluatingGeofence}
                  onClick={() => testGeofence(28.5355, 77.3910, 'Noida Sector 62')}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-left transition"
                >
                  <div className="text-xs font-semibold text-rose-400">Noida Sector 62 (35km)</div>
                  <div className="text-[10px] text-slate-400">Lat: 28.5355, Lng: 77.3910 (Outside)</div>
                </button>
              </div>

              {/* Geofence Result Card */}
              {geofenceResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    geofenceResult.isInsideAirportGeofence
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {geofenceResult.isInsideAirportGeofence
                          ? 'PASSENGER WITHIN AIRPORT BOUNDARY'
                          : 'PASSENGER OUTSIDE AIRPORT ZONE'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Distance to Airport Center: <span className="font-bold">{geofenceResult.distanceKm} km</span> ({geofenceResult.evaluatedLocation})
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 border border-slate-700">
                    {geofenceResult.geofenceStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Tourist Record Selected</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Search with a passport number or select one of the demo profiles above to generate your digital tourist pass.
          </p>
        </div>
      )}
    </div>
  );
};
