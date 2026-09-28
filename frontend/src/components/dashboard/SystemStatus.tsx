import React from 'react';
import { Server, Database, Brain, Cpu, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import type { HealthStatus, ProviderConfig } from '../../types';

interface SystemStatusProps {
  health: HealthStatus | null;
  latencyMs: number;
  config: ProviderConfig | null;
  error: string | null;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  health,
  latencyMs,
  config,
  error,
}) => {
  const isOnline = !!health && health.status === 'ok';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Backend Subsystems & Telemetry</h4>
            <p className="text-xs text-slate-400">Current active configuration and connectivity</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Connected (FastAPI {health.version})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4" />
              Offline: {error || 'Connection Failed'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>LLM Provider</span>
          </div>
          <p className="text-sm font-semibold text-slate-100 uppercase font-mono">
            {config?.active_provider || '—'}
          </p>
          <span className="text-[10px] text-slate-400">
            Options: {config?.available_providers.join(', ') || 'ollama, openai, gemini'}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Vector Store</span>
          </div>
          <p className="text-sm font-semibold text-slate-100 uppercase font-mono">
            {config?.vector_db || '—'}
          </p>
          <span className="text-[10px] text-slate-400">Top-K: {config?.top_k ?? 5} chunks</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Brain className="w-3.5 h-3.5 text-emerald-400" />
            <span>Embedding Model</span>
          </div>
          <p className="text-sm font-semibold text-slate-100 truncate font-mono">
            {config?.embedding_model || '—'}
          </p>
          <span className="text-[10px] text-slate-400">Local sentence-transformers</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Self-Correction</span>
          </div>
          <p className="text-sm font-semibold text-slate-100 font-mono">
            {config?.max_retries ?? 2} max retries
          </p>
          <span className="text-[10px] text-slate-400">Roundtrip latency: {latencyMs}ms</span>
        </div>
      </div>
    </div>
  );
};
