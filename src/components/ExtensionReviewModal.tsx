import React, { useState } from 'react';
import { VisaExtension, OfficerUser } from '../types';
import { FileCheck, X, Check, Ban, AlertCircle, Calendar } from 'lucide-react';

interface ExtensionReviewModalProps {
  extension: VisaExtension;
  officer: OfficerUser | null;
  onClose: () => void;
  onSuccess: (updated: VisaExtension) => void;
}

export const ExtensionReviewModal: React.FC<ExtensionReviewModalProps> = ({
  extension,
  officer,
  onClose,
  onSuccess,
}) => {
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecision = async (action: 'approved' | 'rejected') => {
    setIsSubmitting(true);
    setError(null);

    const badge = officer?.badge_number || 'FRRO-DEL-902';
    try {
      const res = await fetch(`/api/extensions/${extension.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          officer_remarks: remarks || (action === 'approved' ? `Approved ${extension.requested_days} days extension on genuine grounds.` : 'Insufficient documentation provided.'),
          officer_badge: badge,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.extension);
        onClose();
      } else {
        setError(data.error || 'Failed to submit review');
      }
    } catch (err: any) {
      setError(err.message || 'Network communication failure');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900/60 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Review Visa Extension Request</h2>
              <p className="text-xs text-slate-400">Application ID: {extension.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Applicant:</span>
              <span className="font-semibold text-white">{extension.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Passport Number:</span>
              <span className="font-mono text-cyan-400">{extension.passport_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Requested Extension:</span>
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                +{extension.requested_days} Days
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <span className="text-slate-400 block mb-1">Reason Stated by Applicant:</span>
              <p className="text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs leading-relaxed">
                "{extension.reason}"
              </p>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">Supporting Document:</span>
              <a
                href={extension.document_url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
              >
                View Uploaded Cert/Ticket (PDF)
              </a>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Officer Adjudication Remarks
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Valid medical documentation verified with Max Saket hospital. 14 days extension granted."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision('rejected')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>Reject Request</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision('approved')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Approve &amp; Extend Visa</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
