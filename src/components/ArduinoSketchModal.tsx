import React, { useState } from 'react';
import { ESP32_ARDUINO_FIRMWARE } from '../data/arduinoCode';
import { Cpu, X, Copy, Check, Download, Layers, Shield } from 'lucide-react';

interface ArduinoSketchModalProps {
  onClose: () => void;
}

export const ArduinoSketchModal: React.FC<ArduinoSketchModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ESP32_ARDUINO_FIRMWARE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([ESP32_ARDUINO_FIRMWARE], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'efrro_egate_firmware.ino';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Arduino ESP32 Production Firmware Sketch
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/40">
                  .INO SOURCE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Direct I2C LCD, DFPlayer Mini voice audio synthesizer &amp; E-Gate REST client
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hardware Wiring Specs Summary */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Microcontroller</span>
            <span className="text-white font-medium">ESP32 DevKit V1</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Display Module</span>
            <span className="text-emerald-400 font-medium">16x2 I2C LCD (0x27)</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Voice Synthesizer</span>
            <span className="text-amber-400 font-medium">DFPlayer Mini MP3 (UART2)</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Gate Actuator</span>
            <span className="text-cyan-400 font-medium">Servo SG90 / 12V Relay</span>
          </div>
        </div>

        {/* Code View Body */}
        <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-xs text-slate-300">
          <pre className="p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto leading-relaxed">
            {ESP32_ARDUINO_FIRMWARE}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-900 p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Integrates directly with REST endpoint: <code className="text-cyan-300">/api/gate/scan/:identifier</code></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>Download .INO File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
