import React, { useState } from 'react';
import {
  ShieldAlert,
  Radio,
  Cpu,
  UserCheck,
  QrCode,
  BellRing,
  FileText,
  RotateCcw,
  Play,
  Calendar,
  Lock,
  LogOut,
  Smartphone,
  Send,
} from 'lucide-react';
import { OfficerUser } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  officer: OfficerUser | null;
  onLogout: () => void;
  onForceRunEngine: () => void;
  onResetSeed: () => void;
  isEngineRunning: boolean;
  timeOffset: number;
  onTimeOffsetChange: (offset: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  officer,
  onLogout,
  onForceRunEngine,
  onResetSeed,
  isEngineRunning,
  timeOffset,
  onTimeOffsetChange,
}) => {
  const [showTimeTravelModal, setShowTimeTravelModal] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Officer Portal', icon: ShieldAlert, badge: officer ? 'LIVE' : undefined },
    { id: 'arrival', label: 'Traveler Registration & SIM', icon: UserCheck },
    { id: 'tourist', label: 'Traveler Visa Pass & QR', icon: QrCode },
    { id: 'egate', label: 'Smart Departure E-Gate', icon: Cpu, badge: 'IOT' },
    { id: 'mobile', label: '📤 Send Real Mobile Message', icon: Smartphone, badge: 'REAL SMS' },
    { id: 'alerts', label: 'Visa Alerts Audit Log', icon: BellRing },
    { id: 'architecture', label: 'System Architecture', icon: FileText },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
      {/* Top Notification / Status Ticker */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 px-4 py-1.5 border-b border-amber-900/30 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            e-Pravas Security: Visa Compliance Cloud Engine
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 hidden sm:inline">
            Bureau of Immigration, Ministry of Home Affairs, Govt. of India
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Indicator */}
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded shadow-sm">
            <span>🌐 English (EN)</span>
          </span>

          {/* Quick Real Message Sender Link */}
          <button
            onClick={() => setActiveTab('mobile')}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold text-[11px] bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-0.5 rounded transition"
          >
            <Send className="w-3 h-3 text-emerald-400" />
            <span>📤 Real Message Sender</span>
          </button>

          {/* Time travel indicator */}
          <button
            onClick={() => setShowTimeTravelModal(!showTimeTravelModal)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium transition ${
              timeOffset !== 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Time-Travel Simulator for Live Demonstrations"
          >
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>Time Sim: {timeOffset === 0 ? 'Today (Normal)' : `+${timeOffset} Days`}</span>
          </button>

          {/* Force Run Engine Button */}
          <button
            onClick={onForceRunEngine}
            disabled={isEngineRunning}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] shadow-sm transition disabled:opacity-50"
            title="Force immediate evaluation of all visas"
          >
            <Play className={`w-3 h-3 ${isEngineRunning ? 'animate-spin' : ''}`} />
            <span>{isEngineRunning ? 'Evaluating...' : 'Force Run Engine'}</span>
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={onResetSeed}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-[11px] transition"
            title="Reset database to initial seed profiles"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden md:inline">Reset Seed</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-white to-emerald-600 p-[2px] shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[9px] flex flex-col items-center justify-center text-amber-400 font-extrabold text-[10px] leading-tight select-none">
                <span className="text-amber-400 font-black tracking-tight">VISA</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-white sm:text-lg">
                  e-Pravas <span className="text-amber-400 font-black">Security</span>
                </h1>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
                  GOV.IN • v2.6
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Bureau of Immigration, Govt. of India • Smart SIM &amp; Departure E-Gate Clearance
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition relative ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] bg-slate-800 text-cyan-300 px-1.5 py-0.2 rounded border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions & User Auth Info */}
          <div className="flex items-center gap-2.5">
            {/* Prominent Real Mobile Message Sender Button */}
            <button
              onClick={() => setActiveTab('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-lg ${
                activeTab === 'mobile'
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/50 ring-2 ring-emerald-300'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 transform hover:-translate-y-0.5'
              }`}
              title="Open Real World Mobile Message Sender"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send Real Message</span>
              <span className="sm:hidden">Send SMS</span>
            </button>

            {officer ? (
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-slate-200">{officer.full_name}</div>
                  <div className="text-[10px] text-slate-400">Badge: {officer.badge_number}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="text-slate-400 hover:text-rose-400 transition p-1"
                  title="Logout officer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Officer Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="flex lg:hidden overflow-x-auto pb-2 gap-1 scrollbar-none border-t border-slate-900 pt-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Travel Fast Adjustment Panel */}
      {showTimeTravelModal && (
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">Live Time-Travel Simulator:</span>
            <span className="text-slate-400">
              Advance or rewind the evaluation calendar to test T-10, T-3, T-0 expiry &amp; accrued daily overstay fines.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Reset (Today)', days: 0 },
              { label: '+3 Days (Trigger T-3/T-0)', days: 3 },
              { label: '+7 Days (Overstay Trigger)', days: 7 },
              { label: '+14 Days (Accrue ₹28k Fines)', days: 14 },
            ].map(btn => (
              <button
                key={btn.days}
                onClick={() => {
                  onTimeOffsetChange(btn.days);
                  setShowTimeTravelModal(false);
                }}
                className={`px-3 py-1 rounded text-xs font-semibold border transition ${
                  timeOffset === btn.days
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
            <button
              onClick={() => setShowTimeTravelModal(false)}
              className="text-slate-400 hover:text-slate-200 ml-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
