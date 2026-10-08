import React, { useState } from 'react';
import {
  FileText,
  Cpu,
  Layers,
  Presentation,
  ShieldCheck,
  Radio,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { ArduinoSketchModal } from './ArduinoSketchModal';

export const ArchitectureGuide: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'architecture' | 'pitch_script' | 'hardware_wiring' | 'api_specs'>('pitch_script');
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showArduinoModal, setShowArduinoModal] = useState(false);

  const copyCurl = () => {
    navigator.clipboard.writeText(`curl -X GET "http://localhost:3000/api/gate/scan/AU3391055"`);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
            <Presentation className="w-4 h-4" />
            Module 7: Architecture, Wiring &amp; Evaluator Presentation Suite
          </div>
          <h2 className="text-xl font-bold text-white">System Documentation &amp; Live Demo Pitch Script</h2>
          <p className="text-xs text-slate-300">
            Complete technical specifications, 3-minute evaluator presentation flow, hardware pinout diagrams, and REST API contract.
          </p>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'pitch_script', label: '3-Min Pitch Script', icon: Presentation },
            { id: 'architecture', label: 'System Architecture', icon: Layers },
            { id: 'hardware_wiring', label: 'Hardware Pinouts', icon: Cpu },
            { id: 'api_specs', label: 'REST API Specs', icon: Terminal },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SubTab 1: 3-Minute Live Evaluator Presentation Script */}
      {activeSubTab === 'pitch_script' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Presentation className="w-5 h-5 text-cyan-400" />
                3-Minute Live Presentation &amp; Pitch Script for Evaluators
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Structured walkthrough script engineered to demonstrate all 6 technical modules in under 180 seconds.
              </p>
            </div>
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 font-bold text-xs rounded-full border border-cyan-500/30">
              EVALUATOR READY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Minute 1: The Problem & Solution */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center font-mono">1</span>
                <span>Minute 0:00 – 1:00 (The Paradigm Shift)</span>
              </div>
              <h4 className="text-sm font-bold text-white">From Reactive Exits to Proactive Smart SIM Compliance</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-cyan-300">Speaker Script:</strong> "Good morning esteemed evaluators. Today, immigration border systems operate reactively—authorities discover visa overstays only when an individual attempts to board a flight at departure.
                <br /><br />
                <strong>e-FRRO ProActive</strong> fundamentally changes this paradigm. On arrival, foreign tourist electronic visas are linked directly to provisioned Indian Smart SIMs / eSIMs. Our autonomous cloud compliance engine monitors validity daily, calculating overstays and assessing ₹2,000/day penalties in real time."
              </p>
              <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-400">
                👉 <strong>Live Action:</strong> Show the <strong>FRRO Officer Dashboard</strong> with KPI cards &amp; flagged active overstayers.
              </div>
            </div>

            {/* Minute 2: Automated Escalation & Self-Service */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center font-mono">2</span>
                <span>Minute 1:00 – 2:00 (Escalation &amp; Digital Pass)</span>
              </div>
              <h4 className="text-sm font-bold text-white">4-Tier Escalation &amp; Scannable QR Pass</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-indigo-300">Speaker Script:</strong> "Rather than sudden fines, tourists receive automated proactive warnings at 4 critical milestones: T-10 gentle reminders, T-3 fine policy warnings, T-0 midnight final notices, and escalating daily overstay alerts.
                <br /><br />
                Tourists have full self-service visibility via their Digital Tourist Pass with scannable QR verification, live fee calculators, visa extension submission forms, and GPS airport geo-fencing validation."
              </p>
              <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-400">
                👉 <strong>Live Action:</strong> Switch to <strong>Tourist Pass &amp; QR</strong> tab and demonstrate the dynamic QR pass &amp; Geo-fencing widget.
              </div>
            </div>

            {/* Minute 3: Hardware E-Gate Simulation */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center font-mono">3</span>
                <span>Minute 2:00 – 3:00 (Hardware E-Gate Demo)</span>
              </div>
              <h4 className="text-sm font-bold text-white">Physical Turnstile, LCD Matrix &amp; Voice Synthesis</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-emerald-300">Speaker Script:</strong> "Finally, at the departure gate, our REST endpoint communicates directly with airport hardware. When passenger Liam Hemsworth-Miller scans his passport, the 16x2 LCD immediately signals 'OVERSTAY DETECT', the turnstile locks red, and the voice synthesizer speaks the exact penalty fine.
                <br /><br />
                When compliant traveler Sarah scans, the turnstile turns green, opens the barrier, and grants immediate departure authorization."
              </p>
              <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-400">
                👉 <strong>Live Action:</strong> Open <strong>Hardware E-Gate</strong> tab, click 'Liam (Overstay 4d)' to trigger speech alert &amp; barrier lock, then click 'Sarah (Valid 28d)'.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: System Architecture Diagram */}
      {activeSubTab === 'architecture' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-fadeIn">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              End-to-End System Architecture &amp; Data Pipeline
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              High-throughput asynchronous compliance loop with IoT edge hardware integration.
            </p>
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-blue-800/40 space-y-2">
                <div className="text-xs font-bold text-blue-400 uppercase">Layer 1: Ingestion</div>
                <div className="text-sm font-bold text-white">Airport Arrival Onboarding</div>
                <p className="text-xs text-slate-400">
                  Passport + e-Visa + Smart eSIM profile ID provisioned &amp; registered in database.
                </p>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-indigo-800/40 space-y-2">
                <div className="text-xs font-bold text-indigo-400 uppercase">Layer 2: Logic Engine</div>
                <div className="text-sm font-bold text-white">Autonomous Cloud Engine</div>
                <p className="text-xs text-slate-400">
                  Periodic cron scheduler evaluating overstay days, fine calculations (₹2,000/day) &amp; flag states.
                </p>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-amber-800/40 space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase">Layer 3: Escalation</div>
                <div className="text-sm font-bold text-white">4-Stage Alert Dispatcher</div>
                <p className="text-xs text-slate-400">
                  Automated SMS, eSIM push, and officer notifications logged to audit database table.
                </p>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/40 space-y-2">
                <div className="text-xs font-bold text-emerald-400 uppercase">Layer 4: Edge IoT</div>
                <div className="text-sm font-bold text-white">Hardware E-Gate &amp; Voice</div>
                <p className="text-xs text-slate-400">
                  ESP32 Microcontroller, 16x2 HD44780 LCD, DFPlayer Mini voice MP3, turnstile flap servo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: Hardware Pinouts & Wiring Guide */}
      {activeSubTab === 'hardware_wiring' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                Hardware Wiring Diagram &amp; ESP32 Pin Assignment
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical connection schematics for airport departure turnstiles.
              </p>
            </div>
            <button
              onClick={() => setShowArduinoModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition"
            >
              Open .INO Firmware Code
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                1. I2C 16x2 LCD Matrix Screen (0x27)
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">LCD SDA</span>
                  <span className="font-mono text-cyan-300 font-bold">ESP32 GPIO 21</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">LCD SCL</span>
                  <span className="font-mono text-cyan-300 font-bold">ESP32 GPIO 22</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">LCD VCC / GND</span>
                  <span className="font-mono text-emerald-300 font-bold">5V / GND Rail</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                2. DFPlayer Mini MP3 Voice Module (UART2)
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">DFPlayer RX</span>
                  <span className="font-mono text-amber-300 font-bold">ESP32 GPIO 17 (TX2) via 1kΩ</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">DFPlayer TX</span>
                  <span className="font-mono text-amber-300 font-bold">ESP32 GPIO 16 (RX2)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Speaker SPK_1 / SPK_2</span>
                  <span className="font-mono text-cyan-300 font-bold">8Ω 3W Speaker</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                3. Actuator Servo &amp; Status Indicators
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Gate Turnstile Flap Servo</span>
                  <span className="font-mono text-blue-300 font-bold">ESP32 GPIO 13 (PWM)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Green LED (Clearance Pass)</span>
                  <span className="font-mono text-emerald-300 font-bold">ESP32 GPIO 25</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Red LED (Overstay Intercept)</span>
                  <span className="font-mono text-rose-300 font-bold">ESP32 GPIO 26</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                4. Audio Track Mapping (SD Card /mp3)
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">0001.mp3</span>
                  <span className="text-emerald-300 font-medium">"Clearance verified. Gate opening."</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">0002.mp3</span>
                  <span className="text-rose-300 font-medium">"Overstay detected. Report to counter."</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 4: REST API Specifications */}
      {activeSubTab === 'api_specs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                Hardware Departure Gate API Endpoint Specification
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact JSON schema payload returned to departure turnstiles.
              </p>
            </div>
            <button
              onClick={copyCurl}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCurl ? 'Copied cURL!' : 'Copy cURL'}</span>
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 space-y-3">
            <div>
              <span className="text-emerald-400 font-bold">GET</span>{' '}
              <span className="text-white">/api/gate/scan/:identifier</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Query identifier accepts: Passport Number, eSIM ID, e-Visa Number, or Tourist Pass ID.
            </div>
            <pre className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 overflow-x-auto text-[11px]">
{`{
  "gate_id": "EGATE_DEL_T3_04",
  "passport_number": "AU3391055",
  "full_name": "Liam Hemsworth-Miller",
  "status": "overstayed",
  "overstay_days": 4,
  "fine": 8000.0,
  "message": "OVERSTAY DETECTED! Fine Pending: INR 8,000. Turn to Counter 4.",
  "gate_action": "DENIED",
  "audio_voice_alert": "Attention: Overstay detected for passenger Liam Hemsworth-Miller. Penalty fine rupees 8000. Report to immigration counter."
}`}
            </pre>
          </div>
        </div>
      )}

      {showArduinoModal && <ArduinoSketchModal onClose={() => setShowArduinoModal(false)} />}
    </div>
  );
};
