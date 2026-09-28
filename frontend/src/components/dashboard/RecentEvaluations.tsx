import React from 'react';
import { ShieldCheck, AlertCircle, ShieldAlert, ArrowRight, Clock } from 'lucide-react';
import type { RecentEvaluationItem, DecisionVerdict } from '../../types';

interface RecentEvaluationsProps {
  evaluations: RecentEvaluationItem[];
  onSelectEvaluation?: (id: string) => void;
  onNavigateToPlayground?: () => void;
}

export const RecentEvaluations: React.FC<RecentEvaluationsProps> = ({
  evaluations,
  onSelectEvaluation,
  onNavigateToPlayground,
}) => {
  const getVerdictBadge = (verdict: DecisionVerdict) => {
    switch (verdict) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-700/60 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            PASS
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-700/60 text-amber-400">
            <AlertCircle className="w-3 h-3" />
            WARN
          </span>
        );
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/60 border border-rose-700/60 text-rose-400">
            <ShieldAlert className="w-3 h-3" />
            BLOCK
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Recent RAG Evaluations</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Query-level hallucination audit trail and guardrail enforcement history
          </p>
        </div>
        {onNavigateToPlayground && (
          <button
            onClick={onNavigateToPlayground}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            Open Playground
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {evaluations.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-medium text-slate-200">No evaluations recorded yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Upload a document in Documents tab, then run a query in Playground to trigger retrieval and Jev evaluation.
          </p>
          {onNavigateToPlayground && (
            <button
              onClick={onNavigateToPlayground}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Start in Playground
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Question</th>
                <th className="py-3 px-4">Verdict</th>
                <th className="py-3 px-4">Unsupported Claims</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {evaluations.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                    {item.timestamp}
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-medium max-w-md truncate">
                    {item.question}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getVerdictBadge(item.decision)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {item.unsupportedClaimsCount > 0 ? (
                      <span className="text-rose-400 font-medium">
                        {item.unsupportedClaimsCount} flagged
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">0 claims</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                    {item.latencyMs}ms
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onSelectEvaluation?.(item.id)}
                      className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      Inspect Trace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
