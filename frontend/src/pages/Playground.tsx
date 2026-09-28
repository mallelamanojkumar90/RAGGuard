import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Layers, 
  Clock, 
  AlertCircle, 
  Loader2, 
  HelpCircle,
  Database,
  ShieldCheck,
  ShieldAlert,
  Flame,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../services/api';
import type { RAGQueryResponse, DocumentItem, DecisionVerdict } from '../types';

export const PlaygroundPage: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [topK, setTopK] = useState<number>(5);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [enableGuardrail, setEnableGuardrail] = useState<boolean>(true);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [result, setResult] = useState<RAGQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRegenHistory, setShowRegenHistory] = useState<boolean>(true);
  const [showRawJev, setShowRawJev] = useState<boolean>(false);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const res = await api.getDocuments();
        setDocuments(res.documents.filter(d => d.status === 'Indexed'));
      } catch (err) {
        console.error('Could not load documents for playground:', err);
      }
    };
    loadDocs();
  }, []);

  const handleAsk = async (queryText?: string) => {
    const textToSubmit = queryText || question;
    if (!textToSubmit.trim()) return;

    setIsQuerying(true);
    setError(null);

    try {
      const res = await api.askRAG({
        question: textToSubmit.trim(),
        top_k: topK,
        document_id: selectedDocId || undefined,
        enable_guardrail: enableGuardrail,
      });
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Query processing failed';
      setError(msg);
      setResult(null);
    } finally {
      setIsQuerying(false);
    }
  };

  const sampleQuestions = [
    "What are the key concepts or objectives outlined in the documents?",
    "Summarize the primary metrics, figures, or results mentioned.",
    "What is the CEO's favorite vacation spot according to the report?",  // Hallucination trap!
  ];

  const renderVerdictBadge = (verdict: DecisionVerdict) => {
    switch (verdict) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-emerald-950/80 border border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-900/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            PASS
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-amber-950/80 border border-amber-500 text-amber-300 shadow-sm shadow-amber-900/30">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            WARN
          </span>
        );
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-rose-950/80 border border-rose-500 text-rose-300 shadow-sm shadow-rose-900/30">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            BLOCK
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Bar Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Ask RAGGuard
            </h3>
            <p className="text-xs text-slate-400">
              Query the indexed knowledge base with Jev hallucination detection & automated self-correction
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Guardrail Toggle */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
              <input
                type="checkbox"
                checked={enableGuardrail}
                onChange={(e) => setEnableGuardrail(e.target.checked)}
                className="rounded accent-indigo-600 cursor-pointer"
              />
              <span className="font-medium text-slate-200">Jev Guardrail Active</span>
            </label>

            {/* Document Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Source:</span>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Documents ({documents.length})</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename}
                  </option>
                ))}
              </select>
            </div>

            {/* Top-K Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Top-K:</span>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
              </select>
            </div>
          </div>
        </div>

        {/* Input & Submit */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isQuerying}
            placeholder="Type your question (e.g. What were the key operating highlights?)..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isQuerying || !question.trim()}
            className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
          >
            {isQuerying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Ask RAGGuard
              </>
            )}
          </button>
        </form>

        {/* Sample prompt chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-500 flex items-center gap-1 text-[11px]">
            <HelpCircle className="w-3.5 h-3.5" />
            Quick Prompts:
          </span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuestion(q);
                handleAsk(q);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <div className="flex-1">
              <span className="font-semibold block">Query Error:</span>
              <span className="text-rose-200">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Results Layout */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Final Answer & Decision & Unsupported Claims */}
          <div className="lg:col-span-2 space-y-6">
            {/* Final Answer Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Guardrail Decision:
                  </span>
                  {renderVerdictBadge(result.final_decision)}
                </div>
                <div className="flex items-center gap-2">
                  {result.regeneration_attempts > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      Corrected ({result.regeneration_attempts} retry)
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {result.provider_used}: {result.model_used}
                  </span>
                </div>
              </div>

              {/* Final Answer Text */}
              <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap font-sans">
                {result.final_answer || result.answer}
              </div>

              {/* Jev Evaluation Telemetry Banner */}
              {result.final_evaluation && (
                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/90 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      Jev System One Grounding Assessment:
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Evaluator: {result.final_evaluation.evaluator_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Grounding Prob</span>
                      <span className="font-bold text-slate-100 text-sm">
                        {(result.final_evaluation.grounding_probability * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Severity</span>
                      <span className={`font-bold text-sm uppercase ${
                        result.final_evaluation.severity === 'critical' ? 'text-rose-400' :
                        result.final_evaluation.severity === 'minor' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {result.final_evaluation.severity || 'None'}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Confidence</span>
                      <span className="font-bold text-slate-100 text-sm">
                        {result.final_evaluation.confidence ? `${(result.final_evaluation.confidence * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Rubric Score</span>
                      <span className="font-bold text-slate-100 text-sm">
                        {result.final_evaluation.grounding_score ?? '—'}/3.0
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed pt-1">
                    {result.final_evaluation.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Unsupported Claims Card (If Any Flagged) */}
            {result.final_evaluation && result.final_evaluation.unsupported_claims.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 backdrop-blur-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-300 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Unsupported Claims Detected ({result.final_evaluation.unsupported_claims.length})
                </div>
                <p className="text-[11px] text-slate-400">
                  The following statements in the generated response lack grounding in the retrieved context:
                </p>
                <div className="space-y-1.5 pt-1">
                  {result.final_evaluation.unsupported_claims.map((claim, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-900/60 text-xs text-rose-200 font-sans leading-relaxed"
                    >
                      "{claim}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Self-Correction History Accordion (If Regeneration Occurred) */}
            {result.regeneration_attempts > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setShowRegenHistory(!showRegenHistory)}
                  className="w-full p-4 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Self-Correction Iteration History ({result.regeneration_attempts} retry attempts)</span>
                  </div>
                  {showRegenHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showRegenHistory && (
                  <div className="p-5 border-t border-slate-800 space-y-4">
                    {/* Initial Rejected Generation */}
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-rose-900/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-rose-300">Initial LLM Generation (Rejected)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-400 font-bold border border-rose-800">
                          {result.initial_decision}
                        </span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap">{result.initial_answer}</p>
                    </div>

                    {/* Subsequent Regeneration Steps */}
                    {result.regeneration_history.map((step) => (
                      <div
                        key={step.attempt}
                        className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-300">
                            Regeneration Attempt #{step.attempt} ({step.latency_ms} ms)
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                            step.decision === 'PASS' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                            step.decision === 'WARN' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                            'bg-rose-950 text-rose-400 border-rose-800'
                          }`}>
                            {step.decision}
                          </span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap">{step.generated_answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Evidence Chunks Section */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Retrieved Evidence Chunks ({result.sources.length})
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500">
                  Sorted by similarity relevance
                </span>
              </div>

              {result.sources.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No matching chunks were retrieved from the knowledge base.
                </div>
              ) : (
                <div className="space-y-3">
                  {result.sources.map((source, idx) => (
                    <div
                      key={source.chunk_id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-indigo-300">
                            Source #{idx + 1}
                          </span>
                          <span>•</span>
                          <span className="text-slate-300 font-medium">
                            {source.document_name}
                          </span>
                          <span>•</span>
                          <span>Page {source.page_number}</span>
                          <span>•</span>
                          <span>Chunk #{source.chunk_index + 1}</span>
                        </div>
                        <span className="font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300 font-semibold text-[10px]">
                          {(source.similarity_score * 100).toFixed(1)}% Match
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                        {source.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Execution Trace & Jev Debug Payload */}
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Layers className="w-4 h-4 text-indigo-400" />
                Pipeline Execution Trace
              </div>

              {result.pipeline_trace ? (
                <div className="space-y-3 text-xs">
                  {result.pipeline_trace.stages.map((st, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{st.name}</span>
                        <span className="font-mono text-indigo-400 font-semibold text-[11px]">
                          {st.latency_ms} ms
                        </span>
                      </div>
                      {st.details && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {Object.entries(st.details).map(([k, v]) => (
                            <span key={k} className="mr-2">
                              {k}: <strong className="text-slate-300">{String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Total Latency:
                    </span>
                    <span className="text-slate-100 font-bold text-sm">
                      {result.total_latency_ms} ms
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Jev Raw Result Inspection Drawer / Box */}
            {result.final_evaluation?.raw_result && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm text-xs">
                <button
                  type="button"
                  onClick={() => setShowRawJev(!showRawJev)}
                  className="w-full flex items-center justify-between font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  <span>Raw Jev SDK Payload</span>
                  {showRawJev ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showRawJev && (
                  <pre className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-60">
                    {JSON.stringify(result.final_evaluation.raw_result, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
