import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import type { BenchmarkReport } from '../types';

export const BenchmarkPage: React.FC = () => {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runProgressMessage, setRunProgressMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestReport = async () => {
    try {
      setError(null);
      const data = await api.getBenchmarkReport();
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load benchmark results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestReport();
  }, []);

  const handleRunBenchmark = async (maxItems?: number) => {
    try {
      setRunning(true);
      setError(null);
      setRunProgressMessage(
        maxItems 
          ? `Evaluating ${maxItems} benchmark items through Baseline & RAGGuard pipelines...`
          : 'Evaluating full 20-sample ground-truth dataset through Baseline & RAGGuard pipelines...'
      );
      const data = await api.runBenchmark(maxItems);
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Benchmark execution failed');
    } finally {
      setRunning(false);
      setRunProgressMessage(null);
    }
  };

  // Filter test cases
  const filteredCases = report?.test_cases.filter((tc) => {
    const matchesCategory = selectedCategory === 'all' || tc.category === selectedCategory;
    const matchesSearch =
      tc.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.expected_answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.baseline_answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  const getCmBadge = (label: 'TP' | 'FP' | 'TN' | 'FN') => {
    switch (label) {
      case 'TP':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="True Positive: Hallucination correctly caught">
            TP (Caught)
          </span>
        );
      case 'TN':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20" title="True Negative: Grounded answer correctly passed">
            TN (Passed)
          </span>
        );
      case 'FP':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20" title="False Positive: False alarm on grounded answer">
            FP (False Alarm)
          </span>
        );
      case 'FN':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20" title="False Negative: Hallucination slipped through">
            FN (Missed)
          </span>
        );
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 border border-emerald-800 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> PASS
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/60 border border-amber-800 text-amber-400">
            <AlertTriangle className="w-3 h-3" /> WARN
          </span>
        );
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/60 border border-rose-800 text-rose-400">
            <XCircle className="w-3 h-3" /> BLOCK
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{decision}</span>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      factual: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
      ambiguous: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
      unanswerable: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      contradiction: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
      'hallucination-trap': 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    };
    const style = colors[category] || 'bg-slate-800 text-slate-300 border-slate-700';
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${style}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Execution Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100">Benchmark: Baseline RAG vs. RAGGuard</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              System One Jev Layer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical comparative evaluation on 20 ground-truth samples across factual, ambiguous, unanswerable, contradiction, and hallucination-trap categories.
          </p>
          {report && (
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 font-mono">
              <span>Model: <span className="text-slate-200">{report.provider_used} ({report.model_used})</span></span>
              <span>•</span>
              <span>Evaluated: <span className="text-slate-200">{new Date(report.timestamp).toLocaleString()}</span></span>
              <span>•</span>
              <span>Samples: <span className="text-slate-200">{report.total_questions}</span></span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLatestReport()}
            disabled={running || loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center justify-center disabled:opacity-50"
            title="Refresh Benchmark"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => handleRunBenchmark(5)}
            disabled={running}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Quick Test (5)
          </button>

          <button
            onClick={() => handleRunBenchmark()}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition flex items-center gap-2 disabled:opacity-50"
          >
            {running ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Running Benchmark...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run Full Benchmark (20)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress / Status banner */}
      {running && (
        <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-indigo-200">Benchmark in Progress</div>
            <div className="text-xs text-indigo-300/80">{runProgressMessage}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="text-xs text-rose-200">{error}</div>
        </div>
      )}

      {!report && !loading && !running ? (
        /* Empty State */
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-16 text-center backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <BarChart3 className="w-7 h-7" />
          </div>
          <h4 className="text-base font-semibold text-slate-200">No benchmark run executed yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 mb-6">
            Execute the benchmark suite against the 20-sample ground-truth dataset to compute precision, recall, F1, and empirical confusion matrix comparing Baseline RAG against RAGGuard.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleRunBenchmark(5)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              Quick Test (5 items)
            </button>
            <button
              onClick={() => handleRunBenchmark()}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4" />
              Run Full Suite (20 items)
            </button>
          </div>
        </div>
      ) : report ? (
        <>
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Precision */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Precision</div>
              <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                {(report.metrics.precision * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">TP / (TP + FP)</div>
            </div>

            {/* Recall */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Recall</div>
              <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                {(report.metrics.recall * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">TP / (TP + FN)</div>
            </div>

            {/* F1 Score */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">F1 Score</div>
              <div className="text-xl font-bold text-indigo-400 mt-1 font-mono">
                {(report.metrics.f1_score * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Harmonic mean</div>
            </div>

            {/* False Positive Rate */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">False Alarm (FPR)</div>
              <div className={`text-xl font-bold mt-1 font-mono ${report.metrics.false_positive_rate > 0.1 ? 'text-amber-400' : 'text-slate-200'}`}>
                {(report.metrics.false_positive_rate * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">FP / (FP + TN)</div>
            </div>

            {/* Baseline Unsupported Rate */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Baseline Halluc.</div>
              <div className="text-xl font-bold text-rose-400 mt-1 font-mono">
                {(report.metrics.baseline_unsupported_rate * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Unguarded flaw rate</div>
            </div>

            {/* RAGGuard Pass Rate */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Final Pass Rate</div>
              <div className="text-xl font-bold text-blue-400 mt-1 font-mono">
                {(report.metrics.ragguard_pass_rate * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Grounded output rate</div>
            </div>

            {/* Self-Correction Success Rate */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Regen Success</div>
              <div className="text-xl font-bold text-teal-400 mt-1 font-mono">
                {(report.metrics.regeneration_success_rate * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{report.metrics.total_regenerations_triggered} retries triggered</div>
            </div>
          </div>

          {/* Confusion Matrix and Latency Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 2x2 Confusion Matrix */}
            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Confusion Matrix (Hallucination Detection)</h4>
                  <p className="text-xs text-slate-400">RAGGuard evaluation performance against ground-truth unsupported answers</p>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Total Samples: {report.total_questions}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* True Positives */}
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/40 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300">True Positives (TP)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                      Hallucination Caught
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-emerald-400 font-mono mt-2">
                    {report.confusion_matrix.true_positives}
                  </div>
                  <p className="text-[11px] text-emerald-400/80 mt-1">
                    Unsupported or ungrounded claims correctly intercepted and blocked / warned.
                  </p>
                </div>

                {/* False Positives */}
                <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-300">False Positives (FP)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
                      False Alarm
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-amber-400 font-mono mt-2">
                    {report.confusion_matrix.false_positives}
                  </div>
                  <p className="text-[11px] text-amber-400/80 mt-1">
                    Fully supported answers flagged unnecessarily (over-cautious false alarm).
                  </p>
                </div>

                {/* False Negatives */}
                <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-800/40 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-300">False Negatives (FN)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300">
                      Missed Hallucination
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-rose-400 font-mono mt-2">
                    {report.confusion_matrix.false_negatives}
                  </div>
                  <p className="text-[11px] text-rose-400/80 mt-1">
                    Material hallucinations that slipped through guardrails unflagged.
                  </p>
                </div>

                {/* True Negatives */}
                <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-800/40 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-300">True Negatives (TN)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300">
                      Accurately Passed
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-blue-400 font-mono mt-2">
                    {report.confusion_matrix.true_negatives}
                  </div>
                  <p className="text-[11px] text-blue-400/80 mt-1">
                    Grounded answers accurately identified and permitted through directly.
                  </p>
                </div>
              </div>
            </div>

            {/* Latency & Overhead Breakdown */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">Latency Comparison</h4>
                <p className="text-xs text-slate-400 mb-4">Baseline LLM speed vs. RAGGuard guarded pipeline</p>

                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Baseline RAG Latency</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {report.latencies.avg_baseline_latency_ms.toFixed(0)} ms
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">Raw prompt retrieval + LLM generation without evaluation</div>
                  </div>

                  <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-indigo-200 font-medium">RAGGuard Full Pipeline</span>
                      <span className="font-mono text-indigo-300 font-bold">
                        {report.latencies.avg_ragguard_latency_ms.toFixed(0)} ms
                      </span>
                    </div>
                    <div className="text-[10px] text-indigo-400/80">Includes Jev grounding evaluation + self-correction retries</div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Guardrail Overhead:</span>
                    <span className="font-mono font-medium text-slate-300">
                      +{(report.latencies.avg_ragguard_latency_ms - report.latencies.avg_baseline_latency_ms).toFixed(0)} ms
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown pills */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">Category Performance</div>
                <div className="space-y-1.5">
                  {Object.entries(report.category_breakdown).map(([cat, stats]) => (
                    <div key={cat} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/30">
                      <span className="text-slate-300 font-medium capitalize">{cat}</span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-rose-400">{stats.blocked} blocked</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-emerald-400">{stats.passed} passed</span>
                        <span className="text-slate-400">({stats.total})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Test Cases Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Evaluation Test Cases ({filteredCases.length})</h4>
                <p className="text-xs text-slate-400">Inspect baseline outputs side-by-side with RAGGuard guardrail decisions</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search test cases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Categories</option>
                  <option value="factual">Factual</option>
                  <option value="ambiguous">Ambiguous</option>
                  <option value="unanswerable">Unanswerable</option>
                  <option value="contradiction">Contradiction</option>
                  <option value="hallucination-trap">Hallucination Trap</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                    <th className="p-3 font-medium">ID</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Question</th>
                    <th className="p-3 font-medium text-center">CM Label</th>
                    <th className="p-3 font-medium text-center">RAGGuard Verdict</th>
                    <th className="p-3 font-medium text-center">Retries</th>
                    <th className="p-3 font-medium text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredCases.map((tc) => {
                    const isExpanded = expandedRowId === tc.id;
                    return (
                      <React.Fragment key={tc.id}>
                        <tr
                          onClick={() => setExpandedRowId(isExpanded ? null : tc.id)}
                          className="hover:bg-slate-800/30 transition cursor-pointer"
                        >
                          <td className="p-3 font-mono text-[11px] text-slate-400">{tc.id}</td>
                          <td className="p-3">{getCategoryBadge(tc.category)}</td>
                          <td className="p-3 max-w-md font-medium text-slate-200 truncate" title={tc.question}>
                            {tc.question}
                          </td>
                          <td className="p-3 text-center">{getCmBadge(tc.cm_label)}</td>
                          <td className="p-3 text-center">{getDecisionBadge(tc.ragguard_final_decision)}</td>
                          <td className="p-3 text-center font-mono">
                            {tc.ragguard_regenerations > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                {tc.ragguard_regenerations}
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRowId(isExpanded ? null : tc.id);
                              }}
                              className="text-slate-400 hover:text-slate-200 transition"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-950/40">
                            <td colSpan={7} className="p-4 space-y-4 border-b border-slate-800">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Baseline Answer */}
                                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                                      Baseline Unguarded LLM
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {tc.baseline_latency_ms.toFixed(0)} ms
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-3 rounded border border-slate-800/80">
                                    {tc.baseline_answer}
                                  </div>
                                  <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                                    <span>Ungrounded / Hallucinated:</span>
                                    {tc.baseline_was_unsupported ? (
                                      <span className="text-rose-400 font-medium">Yes</span>
                                    ) : (
                                      <span className="text-emerald-400 font-medium">No</span>
                                    )}
                                  </div>
                                </div>

                                {/* RAGGuard Final Answer */}
                                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                                      RAGGuard Protected Answer
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {tc.ragguard_latency_ms.toFixed(0)} ms
                                      </span>
                                      {getDecisionBadge(tc.ragguard_final_decision)}
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-3 rounded border border-slate-800/80">
                                    {tc.ragguard_final_answer}
                                  </div>
                                  <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                                    <div>
                                      Initial: <span className="font-mono text-slate-300">{tc.ragguard_initial_decision}</span> → Final: <span className="font-mono text-slate-300">{tc.ragguard_final_decision}</span>
                                    </div>
                                    <div>
                                      Self-corrections: <span className="font-mono text-slate-300">{tc.ragguard_regenerations}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Expected Ground Truth */}
                              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
                                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                  Expected Ground Truth Response
                                </div>
                                <div className="text-xs text-slate-300">
                                  {tc.expected_answer}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
