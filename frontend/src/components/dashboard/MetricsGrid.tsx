import React from 'react';
import { 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  ShieldX, 
  Flame 
} from 'lucide-react';
import type { DashboardMetrics } from '../../types';

interface MetricsGridProps {
  metrics: DashboardMetrics;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const cards = [
    {
      title: 'Documents Indexed',
      value: metrics.documentsIndexed.toString(),
      description: 'PDF knowledge base sources',
      icon: FileText,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-950/20',
      borderColor: 'border-blue-800/40',
    },
    {
      title: 'Questions Evaluated',
      value: metrics.questionsEvaluated.toString(),
      description: 'Total RAG queries inspected',
      icon: HelpCircle,
      iconColor: 'text-indigo-400',
      bgColor: 'bg-indigo-950/20',
      borderColor: 'border-indigo-800/40',
    },
    {
      title: 'Pass Rate',
      value: `${metrics.passRate.toFixed(1)}%`,
      description: 'Grounded, evidence-backed answers',
      icon: CheckCircle,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-950/20',
      borderColor: 'border-emerald-800/40',
    },
    {
      title: 'Warning Rate',
      value: `${metrics.warningRate.toFixed(1)}%`,
      description: 'Partially grounded or uncertain',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-950/20',
      borderColor: 'border-amber-800/40',
    },
    {
      title: 'Block Rate',
      value: `${metrics.blockRate.toFixed(1)}%`,
      description: 'Materially unsupported answers',
      icon: ShieldX,
      iconColor: 'text-rose-400',
      bgColor: 'bg-rose-950/20',
      borderColor: 'border-rose-800/40',
    },
    {
      title: 'Detected Unsupported Answers',
      value: metrics.detectedUnsupportedAnswers.toString(),
      description: 'Hallucinations caught by guardrail',
      icon: Flame,
      iconColor: 'text-violet-400',
      bgColor: 'bg-violet-950/20',
      borderColor: 'border-violet-800/40',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-xl border ${card.bgColor} ${card.borderColor} backdrop-blur-sm transition-all duration-200 hover:border-slate-700`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg bg-slate-900/60 border border-slate-800 ${card.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold tracking-tight text-slate-100">
                {card.value}
              </span>
              <p className="mt-1 text-xs text-slate-400">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
