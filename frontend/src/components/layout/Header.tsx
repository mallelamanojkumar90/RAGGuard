import React from 'react';
import { RefreshCw, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { HealthStatus, ProviderConfig, NavTab } from '../../types';

interface HeaderProps {
  currentTab: NavTab;
  health: HealthStatus | null;
  latencyMs: number;
  providerConfig: ProviderConfig | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'System Dashboard',
    subtitle: 'Real-time telemetry, guardrail rates, and recent RAG evaluations',
  },
  documents: {
    title: 'Knowledge Base Documents',
    subtitle: 'Upload, inspect chunks, and manage indexed PDF source material',
  },
  playground: {
    title: 'Guardrail Playground',
    subtitle: 'Test RAG queries with live Jev evaluation, citation verification, and self-correction',
  },
  evaluations: {
    title: 'Evaluation Explorer',
    subtitle: 'Deep-dive trace analysis: claims, groundings, decisions, and raw Jev payloads',
  },
  benchmark: {
    title: 'Benchmark & Accuracy',
    subtitle: 'Quantitative comparisons: Raw RAG baseline vs. RAGGuard protected pipeline',
  },
  settings: {
    title: 'Platform Settings',
    subtitle: 'Configure LLM inference providers, vector DB parameters, and guardrail rules',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  health,
  latencyMs,
  providerConfig,
  isLoading,
  onRefresh,
}) => {
  const current = tabTitles[currentTab];
  const isOnline = !!health && health.status === 'ok';

  return (
    <header className="h-16 bg-slate-900/60 backdrop-blur border-b border-slate-800 px-8 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          {current.title}
        </h1>
        <p className="text-xs text-slate-400">{current.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Provider Tag */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Provider:</span>
          <span className="font-mono font-medium text-slate-200 uppercase">
            {providerConfig?.active_provider || 'Loading...'}
          </span>
        </div>

        {/* Backend Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-medium ${
          isOnline
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
            : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
        }`}>
          {isOnline ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" />
          )}
          <span>{isOnline ? `Backend Online (${latencyMs}ms)` : 'Backend Disconnected'}</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh backend status"
          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
