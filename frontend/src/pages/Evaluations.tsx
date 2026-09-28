import React, { useState, useEffect } from 'react';
import { 
  FileJson, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  ShieldAlert, 
  X, 
  RotateCcw,
  Sliders,
  Database,
  Search
} from 'lucide-react';
import { api } from '../services/api';
import type { RAGQueryResponse, DecisionVerdict } from '../types';

export const EvaluationsPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<RAGQueryResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrace, setSelectedTrace] = useState<RAGQueryResponse | null>(null);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.getEvaluationHistory();
      setEvaluations(res.evaluations);
    } catch (err) {
      console.error('Failed to load evaluation records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = evaluations.filter((e) =>
    e.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.final_answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileJson className="w-5 h-5 text-indigo-400" />
            Evaluation Explorer & Audit Traces
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent inspection of evidence groundings, Jev verdicts, unsupported claims, and self-correction iterations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search traces..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={loadHistory}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        {evaluations.length === 0 ? (
          <div className="p-16 text-center">
            <FileJson className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-slate-200">No evaluations recorded yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Run queries in the Playground to evaluate answers with Jev and generate persistent audit traces.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4">Initial Decision</th>
                  <th className="py-3 px-4">Final Verdict</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium max-w-sm truncate">
                      {item.question}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getVerdictBadge(item.initial_decision)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getVerdictBadge(item.final_decision)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono">
                      {item.regeneration_attempts > 0 ? (
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          {item.regeneration_attempts} retry
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {item.total_latency_ms}ms
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTrace(item)}
                        className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-medium cursor-pointer transition-colors"
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

      {/* Detailed Trace Inspection Modal */}
      {selectedTrace && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">Audit Trace Details</h3>
                    {getVerdictBadge(selectedTrace.final_decision)}
                  </div>
                  <p className="text-xs font-mono text-slate-400 truncate max-w-md">ID: {selectedTrace.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrace(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Question */}
              <div className="space-y-1">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">User Question</span>
                <p className="text-sm text-slate-100 font-medium bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {selectedTrace.question}
                </p>
              </div>

              {/* Initial Answer vs Final Answer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Initial LLM Answer</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {selectedTrace.initial_decision}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed max-h-40 overflow-y-auto">
                    {selectedTrace.initial_answer || selectedTrace.answer}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Final Accepted Answer</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {selectedTrace.final_decision}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 leading-relaxed max-h-40 overflow-y-auto">
                    {selectedTrace.final_answer || selectedTrace.answer}
                  </div>
                </div>
              </div>

              {/* Jev Assessment Summary */}
              {selectedTrace.final_evaluation && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-indigo-300 text-xs">
                    <Sliders className="w-4 h-4" />
                    Jev System One Evaluation Telemetry
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Grounding Prob</span>
                      <span className="font-bold text-slate-100 text-sm">
                        {(selectedTrace.final_evaluation.grounding_probability * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Severity</span>
                      <span className="font-bold text-slate-100 text-sm uppercase">
                        {selectedTrace.final_evaluation.severity || 'None'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Confidence</span>
                      <span className="font-bold text-slate-100 text-sm">
                        {selectedTrace.final_evaluation.confidence ? `${(selectedTrace.final_evaluation.confidence * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Rubric Score</span>
                      <span className="font-bold text-slate-100 text-sm">
                        {selectedTrace.final_evaluation.grounding_score ?? '—'}/3.0
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    {selectedTrace.final_evaluation.explanation}
                  </p>
                </div>
              )}

              {/* Unsupported Claims (if any) */}
              {selectedTrace.final_evaluation && selectedTrace.final_evaluation.unsupported_claims.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 space-y-2">
                  <span className="font-semibold text-rose-300 text-xs uppercase tracking-wider block">
                    Flagged Unsupported Claims
                  </span>
                  <div className="space-y-1">
                    {selectedTrace.final_evaluation.unsupported_claims.map((claim, idx) => (
                      <div key={idx} className="p-2 rounded bg-rose-950/60 border border-rose-900/60 text-rose-200">
                        "{claim}"
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retrieved Sources */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  Retrieved Evidence Chunks ({selectedTrace.sources.length})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTrace.sources.map((s, i) => (
                    <div key={s.chunk_id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>[Source {i + 1}] {s.document_name} • Page {s.page_number}</span>
                        <span className="font-mono text-blue-400 font-semibold">
                          {(s.similarity_score * 100).toFixed(1)}% Match
                        </span>
                      </div>
                      <p className="text-slate-300">{s.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Jev SDK Payload */}
              {selectedTrace.final_evaluation?.raw_result && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                    Verbatim Jev SDK Payload
                  </span>
                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedTrace.final_evaluation.raw_result, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTrace(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
