import React from 'react';
import { Settings as SettingsIcon, Cpu, Database, Sliders, Server } from 'lucide-react';
import type { HealthStatus, ProviderConfig } from '../types';

interface SettingsPageProps {
  health: HealthStatus | null;
  config: ProviderConfig | null;
  latencyMs: number;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ health, config, latencyMs }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-800/60 text-indigo-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Environment & Provider Configuration</h3>
            <p className="text-xs text-slate-400">
              Loaded dynamically from backend configuration and environment variables
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LLM Inference Provider */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            LLM Inference Provider
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Active Provider:</span>
              <span className="px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 font-mono text-sm uppercase font-semibold block">
                {config?.active_provider || 'Loading...'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Supported Providers:</span>
              <div className="flex flex-wrap gap-1.5">
                {(config?.available_providers || ['ollama', 'openai', 'gemini', 'openrouter']).map((p) => (
                  <span
                    key={p}
                    className={`px-2.5 py-1 rounded text-xs font-mono uppercase ${
                      p === config?.active_provider
                        ? 'bg-indigo-600/30 border border-indigo-500 text-indigo-200'
                        : 'bg-slate-950/70 border border-slate-800 text-slate-400'
                    }`}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Configured via LLM_PROVIDER in .env. API keys are safely managed on the server.
            </p>
          </div>
        </div>

        {/* Vector DB & Embeddings */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider">
            <Database className="w-4 h-4" />
            Storage & Retrieval
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Active Vector Store:</span>
              <span className="px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 font-mono text-sm uppercase font-semibold block">
                {config?.vector_db || 'Chroma'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Embedding Model:</span>
              <span className="px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 font-mono block">
                {config?.embedding_model || 'all-MiniLM-L6-v2'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Top-K Retrieval Chunks:</span>
              <span className="font-mono text-slate-200 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {config?.top_k ?? 5}
              </span>
            </div>
          </div>
        </div>

        {/* Guardrail Policy */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
            <Sliders className="w-4 h-4" />
            Guardrail & Self-Correction Policy
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Max Regeneration Attempts:</span>
              <span className="font-mono text-slate-200 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {config?.max_retries ?? 2}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Evaluation Engine:</span>
              <span className="font-semibold text-indigo-300">
                Jev (TypeSafe AI)
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Decision Outcomes:</span>
              <div className="flex gap-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">PASS</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">WARN</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60">BLOCK</span>
              </div>
            </div>
          </div>
        </div>

        {/* Server & Network Diagnostics */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <Server className="w-4 h-4" />
            Backend Diagnostics
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">App Name:</span>
              <span className="text-slate-200">{health?.app || 'RAGGuard'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">API Version:</span>
              <span className="text-slate-200">{health?.version || '0.1.0'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Roundtrip Latency:</span>
              <span className="text-slate-200">{latencyMs} ms</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Timestamp:</span>
              <span className="text-slate-300 truncate max-w-[200px]">{health?.timestamp || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
