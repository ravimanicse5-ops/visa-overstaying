import React, { useState, useEffect } from 'react';
import {
  Traveler,
  OfficerUser,
  ComplianceStats,
  VisaExtension,
  Alert,
  LiveMobileMessage,
} from './types';
import { Navbar } from './components/Navbar';
import { OfficerDashboard } from './components/OfficerDashboard';
import { ArrivalRegistration } from './components/ArrivalRegistration';
import { TouristPortal } from './components/TouristPortal';
import { EGateSimulator } from './components/EGateSimulator';
import { AlertsAuditLog } from './components/AlertsAuditLog';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { RealMobileMessageSender } from './components/RealMobileMessageSender';
import { LiveNotificationToast } from './components/LiveNotificationToast';
import {
  ShieldCheck,
  Radio,
  Zap,
  CheckCircle,
  AlertOctagon,
  RefreshCw,
  BellRing,
  Smartphone,
  Send,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [extensions, setExtensions] = useState<VisaExtension[]>([]);
  const [officer, setOfficer] = useState<OfficerUser | null>({
    id: 'OFFICER-001',
    username: 'officer1',
    full_name: 'Rajesh Sharma',
    badge_number: 'BOI-DEL-902',
    role: 'Senior Bureau of Immigration Officer',
    token: 'jwt_mock_token_officer1_default',
  });
  const [selectedTravelerId, setSelectedTravelerId] = useState<string | null>(null);
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [lastEngineMessage, setLastEngineMessage] = useState<string | null>(null);
  const [activeMobileToast, setActiveMobileToast] = useState<LiveMobileMessage | null>(null);

  // Fetch all initial data
  const fetchData = async () => {
    try {
      const [resTravelers, resStats, resAlerts, resExtensions] = await Promise.all([
        fetch('/api/travelers'),
        fetch('/api/compliance/stats'),
        fetch('/api/alerts'),
        fetch('/api/extensions'),
      ]);

      if (resTravelers.ok) {
        const data = await resTravelers.json();
        setTravelers(data);
        if (!selectedTravelerId && data.length > 0) {
          setSelectedTravelerId(data[0].id);
        }
      }
      if (resStats.ok) {
        setStats(await resStats.json());
      }
      if (resAlerts.ok) {
        setAlerts(await resAlerts.json());
      }
      if (resExtensions.ok) {
        setExtensions(await resExtensions.json());
      }
    } catch (err) {
      console.error('Data fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to live stream for real-time state synchronization & instant mobile alert toasts
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/live-stream');
      eventSource.addEventListener('mobile_alert', (e: any) => {
        fetchData();
        try {
          const data: LiveMobileMessage = JSON.parse(e.data);
          setActiveMobileToast(data);
        } catch (err) {
          console.warn('Failed to parse mobile_alert for toast:', err);
        }
      });
      eventSource.addEventListener('gate_scan', () => {
        fetchData();
      });
    } catch (e) {
      console.warn('SSE connection failed in App:', e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Force Run Compliance Engine
  const handleForceRunEngine = async () => {
    setIsEngineRunning(true);
    try {
      const res = await fetch('/api/compliance/force-run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLastEngineMessage(
          `Evaluated ${data.result.evaluated} profiles: ${data.result.overstayedCount} Overstayed, ${data.result.expiringSoonCount} Expiring Soon, ${data.result.newAlerts.length} New Alerts Triggered.`
        );
        fetchData();
        setTimeout(() => setLastEngineMessage(null), 6000);
      }
    } catch (err: any) {
      console.error('Engine error:', err);
    } finally {
      setIsEngineRunning(false);
    }
  };

  // Time Travel Simulator Offset Change
  const handleTimeOffsetChange = async (offsetDays: number) => {
    setTimeOffset(offsetDays);
    setIsEngineRunning(true);
    try {
      const res = await fetch('/api/compliance/time-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offsetDays }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastEngineMessage(
          `Simulated Calendar Advanced +${offsetDays} Days. System Date: ${data.currentSimulatedDate}. Accrued fines updated.`
        );
        fetchData();
        setTimeout(() => setLastEngineMessage(null), 6000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEngineRunning(false);
    }
  };

  // Reset demo seed data
  const handleResetSeed = async () => {
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      if (res.ok) {
        setTimeOffset(0);
        setLastEngineMessage('Database reset to initial 8 synthetic demo tourist profiles.');
        fetchData();
        setTimeout(() => setLastEngineMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        officer={officer}
        onLogout={() => setOfficer(null)}
        onForceRunEngine={handleForceRunEngine}
        onResetSeed={handleResetSeed}
        isEngineRunning={isEngineRunning}
        timeOffset={timeOffset}
        onTimeOffsetChange={handleTimeOffsetChange}
      />

      {/* Engine Status Ticker / Toast */}
      {lastEngineMessage && (
        <div className="bg-blue-600 text-white text-xs px-4 py-2 text-center font-medium shadow-md flex items-center justify-center gap-2 animate-fadeIn sticky top-[88px] z-30">
          <Zap className="w-3.5 h-3.5 animate-bounce" />
          <span>{lastEngineMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <OfficerDashboard
            travelers={travelers}
            stats={stats}
            officer={officer}
            onLogin={user => setOfficer(user)}
            onRefreshData={fetchData}
            onForceRunEngine={handleForceRunEngine}
            isEngineRunning={isEngineRunning}
            onSelectTravelerForPortal={id => {
              setSelectedTravelerId(id);
              setActiveTab('tourist');
            }}
            extensions={extensions}
            onExtensionUpdated={() => fetchData()}
            onTravelerResolved={() => fetchData()}
          />
        )}

        {activeTab === 'arrival' && (
          <ArrivalRegistration
            onSuccess={newTraveler => {
              fetchData();
              setSelectedTravelerId(newTraveler.id);
            }}
            onOpenTouristPass={id => {
              setSelectedTravelerId(id);
              setActiveTab('tourist');
            }}
          />
        )}

        {activeTab === 'tourist' && (
          <TouristPortal
            travelers={travelers}
            selectedTravelerId={selectedTravelerId}
            onSelectTraveler={id => setSelectedTravelerId(id)}
            onExtensionSubmitted={() => fetchData()}
            onNavigateTab={tab => setActiveTab(tab)}
          />
        )}

        {activeTab === 'egate' && (
          <EGateSimulator
            travelers={travelers}
            onOpenPass={id => {
              setSelectedTravelerId(id);
              setActiveTab('tourist');
            }}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsAuditLog
            alerts={alerts}
            travelers={travelers}
            onRefreshAlerts={fetchData}
            onNavigateTab={tab => setActiveTab(tab)}
          />
        )}

        {activeTab === 'mobile' && (
          <RealMobileMessageSender
            travelers={travelers}
            onOpenPass={id => {
              setSelectedTravelerId(id);
              setActiveTab('tourist');
            }}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureGuide />}
      </main>

      {/* Global Live Mobile Alert Notification Banner */}
      <LiveNotificationToast
        notification={activeMobileToast}
        onClose={() => setActiveMobileToast(null)}
        onOpenPhone={() => setActiveTab('mobile')}
      />

      {/* Floating Quick-Access Real World Mobile Message Sender Button */}
      {activeTab !== 'mobile' && (
        <button
          onClick={() => setActiveTab('mobile')}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-bold border-2 border-emerald-400/50 transform hover:scale-105 transition group cursor-pointer"
          title="Open Real Mobile Message & Alert Sender"
        >
          <div className="relative">
            <Send className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition" />
            <span className="w-2 h-2 rounded-full bg-emerald-300 absolute -top-0.5 -right-0.5 animate-ping" />
          </div>
          <span>📤 Send Real Mobile Message</span>
          <span className="text-[10px] bg-slate-950/40 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.5 rounded-full font-mono font-bold">
            REAL SMS
          </span>
        </button>
      )}

      {/* Global Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-500 via-white to-emerald-600 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-[8px] text-cyan-400 font-bold">
                🇮🇳
              </div>
            </div>
            <span className="text-slate-300 font-semibold">
              e-Pravas Security • Bureau of Immigration, Ministry of Home Affairs, Govt. of India
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Push Stream &amp; SMPP Active
            </span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('mobile')}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Smartphone className="w-3 h-3" />
              Live Mobile Alerts
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('egate')}
              className="text-cyan-400 hover:underline"
            >
              Departure E-Gate
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
