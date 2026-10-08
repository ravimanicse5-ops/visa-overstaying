import React, { useState } from 'react';
import { Traveler, OfficerUser } from '../types';
import { ShieldCheck, X, AlertTriangle, CheckCircle, IndianRupee } from 'lucide-react';

interface ResolveCaseModalProps {
  traveler: Traveler;
  officer: OfficerUser | null;
  onClose: () => void;
  onSuccess: (updatedTraveler: Traveler) => void;
}

export const ResolveCaseModal: React.FC<ResolveCaseModalProps> = ({
  traveler,
  officer,
  onClose,
  onSuccess,
}) => {
  const [resolutionType, setResolutionType] = useState<'fine_payment' | 'deportation_clearance' | 'medical_waiver'>('fine_payment');
  const [receiptNumber, setReceiptNumber] = useState(`FRRO-REC-${Math.floor(1000 + Math.random() * 9000)}`);
  const [customNotes, setCustomNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const badge = officer?.badge_number || 'FRRO-DEL-902';
    const notesSummary = `Type: ${resolutionType.toUpperCase()} | Receipt/Ref: ${receiptNumber} | Notes: ${customNotes || 'Case verified & cleared for departure.'}`;

    try {
      const res = await fetch(`/api/travelers/${traveler.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notesSummary,
          officer_badge: badge,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.traveler);
        onClose();
      } else {
        setError(data.error || 'Failed to resolve case');
      }
    } catch (err: any) {
      setError(err.message || 'Network connection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/60 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Overstay Case Resolution</h2>
              <p className="text-xs text-slate-400">Immigration Officer Case Clearance Workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Traveler Info Box */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Traveler Name:</span>
              <span className="font-semibold text-white">{traveler.full_name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Passport Number:</span>
              <span className="font-mono text-cyan-400">{traveler.passport_number}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Overstay Duration:</span>
              <span className="text-rose-400 font-semibold">{traveler.overstay_days} Days Overstay</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
              <span className="text-slate-300 font-medium">Assessed Penalty Fine:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-0.5 text-sm">
                <IndianRupee className="w-3.5 h-3.5" />
                {traveler.fine_amount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Resolution Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Resolution Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'fine_payment', label: 'Fine Settled' },
                { id: 'deportation_clearance', label: 'Deportation Exit' },
                { id: 'medical_waiver', label: 'Official Waiver' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setResolutionType(opt.id as any)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition ${
                    resolutionType === opt.id
                      ? 'bg-blue-600/30 text-blue-300 border-blue-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Receipt / Voucher Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Receipt / Settlement Reference ID
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Officer Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Immigration Officer Endorsement Notes
            </label>
            <textarea
              rows={3}
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              placeholder="e.g. Fine collected via POS Machine at Counter 4. Passenger allowed exit on flight AI-102."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
            <span className="font-semibold text-slate-300">Action Impact:</span> Marking this case as resolved will lift
            the E-Gate departure flag, update the passport clearance status, and dispatch an automated SMS clearance
            certificate.
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing Clearance...' : 'Authorize Resolution & Lift Flag'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
