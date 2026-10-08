import React, { useState, useEffect } from 'react';
import { Traveler, GateScanResponse, GateScanLog } from '../types';
import {
  Cpu,
  Radio,
  Volume2,
  VolumeX,
  Play,
  CheckCircle,
  AlertOctagon,
  FileCode,
  ScanLine,
  IndianRupee,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { ArduinoSketchModal } from './ArduinoSketchModal';

interface EGateSimulatorProps {
  travelers: Traveler[];
  onOpenPass: (travelerId: string) => void;
}

export const EGateSimulator: React.FC<EGateSimulatorProps> = ({
  travelers,
  onOpenPass,
}) => {
  const [identifierInput, setIdentifierInput] = useState('AU3391055');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<GateScanResponse | null>(null);
  const [gateLogs, setGateLogs] = useState<GateScanLog[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lcdLine1, setLcdLine1] = useState('PRAVAS-DWAR [T3]');
  const [lcdLine2, setLcdLine2] = useState('SCAN PASSPORT/QR');
  const [gateOpen, setGateOpen] = useState(false);
  const [showArduinoModal, setShowArduinoModal] = useState(false);

  // Fetch initial gate logs
  const fetchGateLogs = async () => {
    try {
      const res = await fetch('/api/gate/logs');
      if (res.ok) {
        const data = await res.json();
        setGateLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGateLogs();
  }, []);

  // Web Speech API Voice Synthesizer
  const speakVoiceAlert = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop prior audio
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      // Prefer standard English voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.includes('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
    }
  };

  const handleScan = async (idToScan: string) => {
    if (!idToScan.trim()) return;
    setIsScanning(true);
    setLcdLine1('VERIFYING VISA..');
    setLcdLine2(idToScan.slice(0, 16).toUpperCase());

    try {
      const res = await fetch(`/api/gate/scan/${encodeURIComponent(idToScan.trim())}`);
      const data: GateScanResponse = await res.json();
      setScanResult(data);

      if (data.gate_action === 'GRANTED') {
        setGateOpen(true);
        setLcdLine1('GATE OPEN: PASS');
        setLcdLine2('HAVE SAFE FLIGHT');
        speakVoiceAlert(data.audio_voice_alert);
        setTimeout(() => {
          setGateOpen(false);
        }, 5000);
      } else {
        setGateOpen(false);
        setLcdLine1('OVERSTAY DETECT!');
        setLcdLine2(`FINE: INR ${Math.round(data.fine)}`);
        speakVoiceAlert(data.audio_voice_alert);
      }

      fetchGateLogs();
    } catch (err: any) {
      setLcdLine1('SERVER COMM ERR');
      setLcdLine2('CHECK BACKEND');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 p-6 rounded-2xl border border-emerald-800/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            Module 6: Hardware E-Gate Terminal &amp; Speech Voice Synthesizer
          </div>
          <h2 className="text-xl font-bold text-white">Smart Departure E-Gate: Autonomous Airport Departure Gate System</h2>
          <p className="text-xs text-slate-300">
            Bureau of Immigration, Govt. of India • Real-time I2C LCD matrix display, motor turnstile status, and browser Web Speech voice synthesizer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              voiceEnabled
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
            title="Toggle audible Web Speech synthesizer voice alert"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span>Voice Alerts: {voiceEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowArduinoModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold shadow-md transition"
          >
            <FileCode className="w-4 h-4" />
            <span>ESP32 Sketch (.INO)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Terminal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Physical Gate Hardware Rendering (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            {/* Terminal Top Info */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-white uppercase">PRAVAS_EGATE_DEL_T3_04</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                REST API: <code className="text-cyan-400">GET /api/gate/scan/:id</code>
              </div>
            </div>

            {/* Simulated 16x2 LCD Matrix Screen (HD44780 style) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>SIMULATED I2C LCD (16x2 HD44780)</span>
                <span>ADDR: 0x27</span>
              </div>
              <div className="lcd-screen p-4 rounded-xl border-4 border-slate-800 shadow-2xl text-base font-mono font-extrabold tracking-widest space-y-1 select-none">
                <div className="whitespace-pre overflow-hidden h-6 leading-6">
                  {lcdLine1.padEnd(16, ' ').slice(0, 16)}
                </div>
                <div className="whitespace-pre overflow-hidden h-6 leading-6">
                  {lcdLine2.padEnd(16, ' ').slice(0, 16)}
                </div>
              </div>
            </div>

            {/* Turnstile Indicator Lights & Flap Barrier Visualizer */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Physical Turnstile Flap Barrier State
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition ${
                    gateOpen
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                      : scanResult?.gate_action === 'DENIED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {gateOpen ? 'GATE OPEN (AUTHORIZED)' : scanResult?.gate_action === 'DENIED' ? 'GATE LOCKED (DENIED)' : 'GATE CLOSED (IDLE)'}
                </span>
              </div>

              {/* Graphical Turnstile Graphic */}
              <div className="h-28 bg-slate-950 rounded-xl border border-slate-800 relative flex items-center justify-center overflow-hidden">
                {/* Left Post */}
                <div className="absolute left-6 top-4 bottom-4 w-6 bg-slate-800 rounded-lg border border-slate-700 flex flex-col items-center justify-between p-1.5 shadow-md">
                  {/* Green Light */}
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      gateOpen ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-emerald-950 opacity-40'
                    }`}
                  />
                  {/* Red Light */}
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      scanResult?.gate_action === 'DENIED' && !gateOpen
                        ? 'bg-rose-500 shadow-[0_0_14px_#f43f5e]'
                        : 'bg-rose-950 opacity-40'
                    }`}
                  />
                </div>

                {/* Right Post */}
                <div className="absolute right-6 top-4 bottom-4 w-6 bg-slate-800 rounded-lg border border-slate-700 flex flex-col items-center justify-between p-1.5 shadow-md">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      gateOpen ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-emerald-950 opacity-40'
                    }`}
                  />
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      scanResult?.gate_action === 'DENIED' && !gateOpen
                        ? 'bg-rose-500 shadow-[0_0_14px_#f43f5e]'
                        : 'bg-rose-950 opacity-40'
                    }`}
                  />
                </div>

                {/* Motorized Acrylic Flap Barrier */}
                <div className="flex items-center gap-2">
                  <div
                    className={`h-16 w-20 rounded-l-md border transition-all duration-700 transform origin-left flex items-center justify-center text-[10px] font-bold ${
                      gateOpen
                        ? '-rotate-70 opacity-30 bg-emerald-500/20 border-emerald-400'
                        : 'rotate-0 bg-blue-500/30 border-blue-400/80 text-blue-200 shadow-md'
                    }`}
                  >
                    {!gateOpen && 'BARRIER L'}
                  </div>
                  <div
                    className={`h-16 w-20 rounded-r-md border transition-all duration-700 transform origin-right flex items-center justify-center text-[10px] font-bold ${
                      gateOpen
                        ? 'rotate-70 opacity-30 bg-emerald-500/20 border-emerald-400'
                        : 'rotate-0 bg-blue-500/30 border-blue-400/80 text-blue-200 shadow-md'
                    }`}
                  >
                    {!gateOpen && 'BARRIER R'}
                  </div>
                </div>
              </div>
            </div>

            {/* Scanner Input Form */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Scan Traveler Identifier (Passport, eSIM ID, e-Visa, or Pass ID)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ScanLine className="w-4 h-4 text-cyan-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={identifierInput}
                    onChange={e => setIdentifierInput(e.target.value.toUpperCase())}
                    placeholder="e.g. AU3391055 or ESIM-AIRTEL-9905"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => handleScan(identifierInput)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning...' : 'Trigger Gate Scan'}</span>
                </button>
              </div>

              {/* Quick Preset Buttons for Evaluator Live Demo */}
              <div className="pt-2">
                <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  Quick Demo Scan Presets:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifierInput('AU3391055');
                      handleScan('AU3391055');
                    }}
                    className="p-2 rounded-lg bg-slate-900 border border-rose-800/60 hover:bg-rose-950/40 text-left transition"
                  >
                    <div className="text-xs font-bold text-rose-400">Liam (Overstay 4d)</div>
                    <div className="text-[10px] text-slate-400">AU3391055 • Fine ₹8k</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIdentifierInput('GB7718290');
                      handleScan('GB7718290');
                    }}
                    className="p-2 rounded-lg bg-slate-900 border border-emerald-800/60 hover:bg-emerald-950/40 text-left transition"
                  >
                    <div className="text-xs font-bold text-emerald-400">Sarah (Valid 28d)</div>
                    <div className="text-[10px] text-slate-400">GB7718290 • Gate Opens</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIdentifierInput('BR1198234');
                      handleScan('BR1198234');
                    }}
                    className="p-2 rounded-lg bg-slate-900 border border-cyan-800/60 hover:bg-cyan-950/40 text-left transition"
                  >
                    <div className="text-xs font-bold text-cyan-400">Maria (Resolved)</div>
                    <div className="text-[10px] text-slate-400">BR1198234 • Cleared</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIdentifierInput('FAKE-PASSPORT-99');
                      handleScan('FAKE-PASSPORT-99');
                    }}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-left transition"
                  >
                    <div className="text-xs font-bold text-slate-400">Unregistered</div>
                    <div className="text-[10px] text-slate-500">Fake ID • Denied</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scan Result JSON Payload Inspector & Audio Details (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* JSON REST Response Inspector */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Real Hardware REST Payload
                </h4>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">200 OK</span>
            </div>

            {scanResult ? (
              <div className="space-y-3">
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    scanResult.gate_action === 'GRANTED'
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                  }`}
                >
                  <div className="font-bold text-sm flex items-center justify-between">
                    <span>ACTION: {scanResult.gate_action}</span>
                    <span>Status: {scanResult.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 leading-relaxed font-medium">
                    {scanResult.message}
                  </p>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 mb-1 font-mono">Synthesized Voice Alert Output:</div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-cyan-300 italic flex items-start gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>"{scanResult.audio_voice_alert}"</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 mb-1 font-mono">Raw API Response JSON:</div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto">
                    {JSON.stringify(scanResult, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Scan a passport or trigger a preset above to inspect the live hardware response JSON and voice synthesizer.
              </div>
            )}
          </div>

          {/* Recent Gate Scan Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Recent E-Gate Scan Audit Log
              </span>
              <button
                onClick={fetchGateLogs}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {gateLogs.map(log => (
                <div
                  key={log.id}
                  className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{log.full_name}</span>
                      <span className="font-mono text-cyan-400 text-[10px]">({log.passport_number})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(log.scanned_at).toLocaleTimeString()} • {log.message}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.action_taken === 'GRANTED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {log.action_taken}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Arduino Modal */}
      {showArduinoModal && <ArduinoSketchModal onClose={() => setShowArduinoModal(false)} />}
    </div>
  );
};
