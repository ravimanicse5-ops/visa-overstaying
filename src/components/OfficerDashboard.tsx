import React, { useState } from 'react';
import {
  Traveler,
  OfficerUser,
  ComplianceStats,
  VisaExtension,
  ComplianceStatus,
} from '../types';
import {
  Users,
  ShieldCheck,
  Clock,
  AlertOctagon,
  IndianRupee,
  Search,
  Filter,
  Flag,
  CheckCircle2,
  Lock,
  Play,
  RotateCw,
  FileCheck,
  ArrowUpRight,
  MapPin,
  QrCode,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Send,
} from 'lucide-react';
import { ResolveCaseModal } from './ResolveCaseModal';
import { ExtensionReviewModal } from './ExtensionReviewModal';
import { SendMobileAlertModal } from './SendMobileAlertModal';

interface OfficerDashboardProps {
  travelers: Traveler[];
  stats: ComplianceStats | null;
  officer: OfficerUser | null;
  onLogin: (user: OfficerUser) => void;
  onRefreshData: () => void;
  onForceRunEngine: () => void;
  isEngineRunning: boolean;
  onSelectTravelerForPortal: (travelerId: string) => void;
  extensions: VisaExtension[];
  onExtensionUpdated: (ext: VisaExtension) => void;
  onTravelerResolved: (t: Traveler) => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  travelers,
  stats,
  officer,
  onLogin,
  onRefreshData,
  onForceRunEngine,
  isEngineRunning,
  onSelectTravelerForPortal,
  extensions,
  onExtensionUpdated,
  onTravelerResolved,
}) => {
  // Login Form State
  const [username, setUsername] = useState('officer1');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false);

  // Modals
  const [resolvingTraveler, setResolvingTraveler] = useState<Traveler | null>(null);
  const [reviewingExtension, setReviewingExtension] = useState<VisaExtension | null>(null);
  const [selectedTravelerDetails, setSelectedTravelerDetails] = useState<Traveler | null>(null);
  const [messagingTraveler, setMessagingTraveler] = useState<Traveler | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLogin({
          ...data.user,
          token: data.token,
        });
      } else {
        setLoginError(data.message || 'Authentication failed');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Connection error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Filtered traveler list
  const filteredTravelers = travelers.filter(t => {
    if (showOnlyFlagged && t.is_flagged !== 1) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.full_name.toLowerCase().includes(q) ||
        t.passport_number.toLowerCase().includes(q) ||
        t.evisa_number.toLowerCase().includes(q) ||
        t.esim_id.toLowerCase().includes(q) ||
        t.nationality.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const pendingExtensions = extensions.filter(e => e.status === 'pending');
  const flaggedCount = travelers.filter(t => t.is_flagged === 1).length;

  return (
    <div className="space-y-6">
      {/* Officer Auth Gate Banner */}
      {!officer ? (
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-800/40 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                Bureau of Immigration (BOI) • Restricted Officer Access
              </div>
              <h2 className="text-xl font-bold text-white">e-Pravas Immigration Officer Portal</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Log in with authorized immigration officer credentials to adjudicate visa extensions, resolve overstay
                penalties, and enforce airport Departure E-Gate interception flags.
              </p>
              <div className="text-[11px] text-blue-300 font-mono bg-blue-900/30 p-2 rounded border border-blue-800/40 inline-block">
                Officer Login: <span className="text-white font-bold">officer1</span> /{' '}
                <span className="text-white font-bold">admin123</span> (Inspector Rajesh Sharma)
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="w-full md:w-80 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              {loginError && (
                <div className="text-[11px] bg-rose-500/10 text-rose-300 border border-rose-500/30 p-2 rounded">
                  {loginError}
                </div>
              )}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Officer Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Security Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2 rounded-lg transition shadow-md disabled:opacity-50"
              >
                {isLoggingIn ? 'Authenticating...' : 'Sign In as Officer'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Monitored</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats?.total_monitored || travelers.length}</div>
          <div className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Live Smart SIM Tracking
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Compliant</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-2">{stats?.compliant ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">&gt; 5 Days Validity Remaining</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-medium">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-2">{stats?.expiring_soon ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">0–5 Days (T-10, T-3, T-0)</div>
        </div>

        <div className="bg-slate-900 border border-rose-900/50 p-4 rounded-xl relative overflow-hidden bg-gradient-to-b from-rose-950/20 to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-medium">Active Overstayers</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2">{stats?.active_overstayers ?? 0}</div>
          <div className="text-[11px] text-rose-400/80 mt-1 flex items-center gap-1 font-semibold">
            <Flag className="w-3 h-3" />
            {flaggedCount} Flagged for Intercept
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Total Accrued Fines</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            ₹{(stats?.total_accrued_fines ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Rate: ₹2,000 / Day Overstay</div>
        </div>
      </div>

      {/* Priority Action: Pending Visa Extensions Adjudication */}
      {pendingExtensions.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 text-indigo-300 rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{pendingExtensions.length} Visa Extension Application(s) Pending Review</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Tourist(s) submitted extensions with medical/travel reasons awaiting officer authorization.
              </p>
            </div>
          </div>
          <button
            onClick={() => setReviewingExtension(pendingExtensions[0])}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow shrink-0"
          >
            Review Application ({pendingExtensions[0].full_name})
          </button>
        </div>
      )}

      {/* Flagged Records Priority Intercept Banner Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Name, Passport, eSIM, e-Visa..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 w-full focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'valid', label: 'Valid' },
              { id: 'expiring_soon', label: 'Expiring Soon' },
              { id: 'overstayed', label: 'Overstayed' },
              { id: 'resolved', label: 'Resolved' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Flagged Intercept Filter */}
          <button
            onClick={() => setShowOnlyFlagged(!showOnlyFlagged)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              showOnlyFlagged
                ? 'bg-rose-600 text-white border-rose-500 shadow-md animate-pulse'
                : 'bg-slate-950 text-rose-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Priority Intercepts ({flaggedCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onForceRunEngine}
            disabled={isEngineRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600 hover:text-white text-xs font-semibold transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isEngineRunning ? 'animate-spin' : ''}`} />
            <span>{isEngineRunning ? 'Evaluating...' : 'Force Run Cloud Engine'}</span>
          </button>
          <button
            onClick={onRefreshData}
            className="p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
            title="Refresh Roster"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Surveillance Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Traveler &amp; Identity</th>
                <th className="px-4 py-3">Passport &amp; e-Visa</th>
                <th className="px-4 py-3">Smart SIM / eSIM ID</th>
                <th className="px-4 py-3">Validity / Expiry</th>
                <th className="px-4 py-3">Compliance Status</th>
                <th className="px-4 py-3">Accrued Fine</th>
                <th className="px-4 py-3">Flag</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTravelers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No traveler records found matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTravelers.map(traveler => {
                  const isOverstayed = traveler.status === 'overstayed';
                  const isExpiring = traveler.status === 'expiring_soon';
                  const isResolved = traveler.status === 'resolved';

                  return (
                    <tr
                      key={traveler.id}
                      className={`hover:bg-slate-800/40 transition ${
                        traveler.is_flagged === 1 ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      {/* Name & Nationality */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{traveler.full_name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{traveler.nationality}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-500 truncate max-w-[120px]">{traveler.entry_port.split('-')[0]}</span>
                        </div>
                      </td>

                      {/* Passport & eVisa */}
                      <td className="px-4 py-3 font-mono">
                        <div className="text-cyan-300 font-bold">{traveler.passport_number}</div>
                        <div className="text-[10px] text-slate-400">{traveler.evisa_number}</div>
                      </td>

                      {/* Smart SIM */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-emerald-400 text-xs font-semibold">{traveler.esim_id}</div>
                        <div className="text-[10px] text-slate-400">{traveler.phone_number}</div>
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3">
                        <div className="text-slate-200 font-medium">{traveler.visa_expiry_date}</div>
                        <div className="text-[10px] text-slate-400">
                          {isOverstayed
                            ? `${traveler.overstay_days}d overstay`
                            : isExpiring
                            ? 'Expiring soon'
                            : 'Valid authorized'}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        {isOverstayed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <AlertOctagon className="w-3 h-3" />
                            Overstayed ({traveler.overstay_days}d)
                          </span>
                        )}
                        {isExpiring && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            Expiring Soon
                          </span>
                        )}
                        {traveler.status === 'valid' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <ShieldCheck className="w-3 h-3" />
                            Valid
                          </span>
                        )}
                        {isResolved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Resolved
                          </span>
                        )}
                      </td>

                      {/* Fine */}
                      <td className="px-4 py-3">
                        {traveler.fine_amount > 0 ? (
                          <span className="font-bold text-rose-400 flex items-center gap-0.5">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {traveler.fine_amount.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">₹0</span>
                        )}
                      </td>

                      {/* Flagged Status */}
                      <td className="px-4 py-3">
                        {traveler.is_flagged === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] uppercase shadow-sm">
                            <Flag className="w-3 h-3 fill-current" />
                            FLAGGED
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Clear</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send Live Real Mobile Message */}
                          <button
                            onClick={() => setMessagingTraveler(traveler)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/40 transition flex items-center gap-1 text-[11px] font-bold shadow-sm"
                            title="Send real mobile message or WhatsApp to passenger's phone"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Send Message</span>
                          </button>

                          {isOverstayed && (
                            <button
                              onClick={() => setResolvingTraveler(traveler)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-sm"
                              title="Resolve overstay case, fine payment or deportation clearance"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => onSelectTravelerForPortal(traveler.id)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                            title="Open Digital Pass & QR in Tourist Portal"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Overstay Case Resolution Modal */}
      {resolvingTraveler && (
        <ResolveCaseModal
          traveler={resolvingTraveler}
          officer={officer}
          onClose={() => setResolvingTraveler(null)}
          onSuccess={updated => {
            onTravelerResolved(updated);
            setResolvingTraveler(null);
          }}
        />
      )}

      {/* Extension Review Modal */}
      {reviewingExtension && (
        <ExtensionReviewModal
          extension={reviewingExtension}
          officer={officer}
          onClose={() => setReviewingExtension(null)}
          onSuccess={updated => {
            onExtensionUpdated(updated);
            setReviewingExtension(null);
          }}
        />
      )}

      {/* Live Mobile Message Alert Dispatch Modal */}
      {messagingTraveler && (
        <SendMobileAlertModal
          traveler={messagingTraveler}
          onClose={() => setMessagingTraveler(null)}
          onAlertSent={() => {
            onRefreshData();
          }}
        />
      )}
    </div>
  );
};
