import React, { useState } from 'react';
import { Alert, Traveler, AlertStage } from '../types';
import { notificationService } from '../utils/notificationAudio';
import {
  BellRing,
  Smartphone,
  Mail,
  Radio,
  Send,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  Share2,
  ExternalLink,
} from 'lucide-react';

interface AlertsAuditLogProps {
  alerts: Alert[];
  travelers: Traveler[];
  onRefreshAlerts: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const AlertsAuditLog: React.FC<AlertsAuditLogProps> = ({
  alerts,
  travelers,
  onRefreshAlerts,
  onNavigateTab,
}) => {
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlertForPreview, setSelectedAlertForPreview] = useState<Alert | null>(
    alerts.length > 0 ? alerts[0] : null
  );

  // Manual Trigger Form
  const [selectedTravelerId, setSelectedTravelerId] = useState(
    travelers.length > 0 ? travelers[0].id : ''
  );
  const [manualStage, setManualStage] = useState<AlertStage>('T-3');
  const [manualChannel, setManualChannel] = useState<'SMS' | 'EMAIL' | 'ESIM_PUSH' | 'OFFICER_DISPATCH'>('SMS');
  const [customMsg, setCustomMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);
  const [lastDispatchedAlert, setLastDispatchedAlert] = useState<Alert | null>(null);

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTravelerId) return;

    setIsSending(true);
    setDispatchSuccess(null);

    try {
      const res = await fetch('/api/alerts/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traveler_id: selectedTravelerId,
          stage: manualStage,
          channel: manualChannel,
          custom_message: customMsg || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Trigger live mobile notification feedback
        notificationService.playChimeTone(
          manualStage === 'DAILY_OVERSTAY' ? 'urgent' : 'sms'
        );
        notificationService.vibrate([200, 100, 200]);
        notificationService.showSystemNotification(
          `🇮🇳 [GOV-PRAVAS] Alert Sent to ${data.alert.traveler_name}`,
          data.alert.message
        );

        setDispatchSuccess(`Alert #${data.alert.id} delivered live to ${data.alert.recipient_phone} via ${data.alert.channel}!`);
        setLastDispatchedAlert(data.alert);
        setCustomMsg('');
        onRefreshAlerts();
        setSelectedAlertForPreview(data.alert);
      }
    } catch (e: any) {
      alert('Failed to dispatch alert: ' + e.message);
    } finally {
      setIsSending(false);
    }
  };

  const openInWhatsApp = (text: string, phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredAlerts = alerts.filter(a => {
    if (stageFilter !== 'all' && a.stage !== stageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.traveler_name.toLowerCase().includes(q) ||
        a.passport_number.toLowerCase().includes(q) ||
        a.recipient_phone.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 p-6 rounded-2xl border border-indigo-800/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <BellRing className="w-4 h-4" />
            Module 3: Multi-Stage Automated Escalation &amp; Alert System
          </div>
          <h2 className="text-xl font-bold text-white">Visa Alert System: Automated Escalation &amp; Notification Audit Log</h2>
          <p className="text-xs text-slate-300">
            Bureau of Immigration, Govt. of India • Audit trail of automated SMS, WhatsApp, and push notifications triggered at T-10, T-3, T-0 expiry, and daily overstay milestones.
          </p>
        </div>

        {/* Milestone Badge Legend & Real Message Sender Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigateTab?.('mobile')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Real Mobile Message</span>
          </button>

          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            T-10 Reminder
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            T-3 Warning
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
            T-0 Expiry
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Daily Overstay
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Filterable Audit Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4">
            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search alert logs by passenger, phone, message..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Stage Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'T-10', label: 'T-10' },
                  { id: 'T-3', label: 'T-3' },
                  { id: 'T-0', label: 'T-0' },
                  { id: 'DAILY_OVERSTAY', label: 'Overstay' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStageFilter(s.id)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition ${
                      stageFilter === s.id
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert List Items */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No notification logs found matching filter.
                </div>
              ) : (
                filteredAlerts.map(alert => {
                  const isSelected = selectedAlertForPreview?.id === alert.id;
                  const isOverstay = alert.stage === 'DAILY_OVERSTAY';
                  const isUrgent = alert.stage === 'T-3' || alert.stage === 'T-0';

                  return (
                    <div
                      key={alert.id}
                      onClick={() => setSelectedAlertForPreview(alert)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{alert.traveler_name}</span>
                            <span className="font-mono text-[10px] text-cyan-400">({alert.passport_number})</span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                                isOverstay
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isUrgent
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {alert.stage}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {alert.message}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1">
                            <span>To: {alert.recipient_phone}</span>
                            <span>•</span>
                            <span>Channel: {alert.channel}</span>
                            <span>•</span>
                            <span>{new Date(alert.sent_at).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-emerald-400 border border-slate-800 shrink-0">
                          {alert.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulated Phone Screen & Manual Dispatcher (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Simulated Mobile Device SMS Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Tourist Smartphone Delivery Preview
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">eSIM SMS / Push</span>
            </div>

            {selectedAlertForPreview ? (
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
                {/* Message Header */}
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                      IND
                    </div>
                    <div>
                      <div className="font-bold text-white">GOVT-eFRRO</div>
                      <div className="text-[10px] text-slate-400">{selectedAlertForPreview.recipient_phone}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(selectedAlertForPreview.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* SMS Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    selectedAlertForPreview.stage === 'DAILY_OVERSTAY'
                      ? 'bg-rose-900/30 border border-rose-700/50 text-rose-200'
                      : selectedAlertForPreview.stage === 'T-3' || selectedAlertForPreview.stage === 'T-0'
                      ? 'bg-amber-900/30 border border-amber-700/50 text-amber-200'
                      : 'bg-blue-900/30 border border-blue-700/50 text-blue-200'
                  }`}
                >
                  {selectedAlertForPreview.message}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Delivered via {selectedAlertForPreview.channel}</span>
                  <span className="text-emerald-400 font-medium">✓✓ Read Receipt Logged</span>
                </div>

                {/* Direct Live Message Quick Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
                  <button
                    type="button"
                    onClick={() => openInWhatsApp(selectedAlertForPreview.message, selectedAlertForPreview.recipient_phone)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-sm"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Send on WhatsApp</span>
                  </button>

                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('mobile')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition shadow-sm"
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>View in Live Phone</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Select an alert from the table on the left to preview device delivery.
              </div>
            )}
          </div>

          {/* Manual Test Dispatch Tool */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Dispatch Live Mobile Message Alert
                </h4>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Rings Phone Live
              </span>
            </div>

            {dispatchSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs rounded-xl space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{dispatchSuccess}</span>
                </div>
                {lastDispatchedAlert && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openInWhatsApp(lastDispatchedAlert.message, lastDispatchedAlert.recipient_phone)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3" />
                      Open in WhatsApp
                    </button>
                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('mobile')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <Smartphone className="w-3 h-3" />
                        View Live Phone
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleManualDispatch} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Tourist Profile</label>
                <select
                  value={selectedTravelerId}
                  onChange={e => setSelectedTravelerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {travelers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.passport_number}) - Status: {t.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Escalation Stage</label>
                  <select
                    value={manualStage}
                    onChange={e => setManualStage(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="T-10">T-10 Reminder</option>
                    <option value="T-3">T-3 Urgent Warning</option>
                    <option value="T-0">T-0 Expiry Notice</option>
                    <option value="DAILY_OVERSTAY">Daily Overstay Notice</option>
                    <option value="MANUAL_OFFICER">Direct Officer Advisory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Delivery Channel</label>
                  <select
                    value={manualChannel}
                    onChange={e => setManualChannel(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SMS">SMS Gateway</option>
                    <option value="ESIM_PUSH">eSIM Push Notification</option>
                    <option value="OFFICER_DISPATCH">Officer Dispatch Priority</option>
                    <option value="EMAIL">Email Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Custom Message Text (Optional)</label>
                <input
                  type="text"
                  value={customMsg}
                  onChange={e => setCustomMsg(e.target.value)}
                  placeholder="Leave empty for automated template message..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Dispatching...' : 'Dispatch Alert Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
