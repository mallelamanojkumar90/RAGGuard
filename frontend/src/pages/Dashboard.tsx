import React from 'react';
import { MetricsGrid } from '../components/dashboard/MetricsGrid';
import { RecentEvaluations } from '../components/dashboard/RecentEvaluations';
import { SystemStatus } from '../components/dashboard/SystemStatus';
import type { DashboardMetrics, HealthStatus, ProviderConfig, RecentEvaluationItem, NavTab } from '../types';

interface DashboardPageProps {
  metrics: DashboardMetrics;
  recentEvaluations: RecentEvaluationItem[];
  health: HealthStatus | null;
  latencyMs: number;
  providerConfig: ProviderConfig | null;
  error: string | null;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  recentEvaluations,
  health,
  latencyMs,
  providerConfig,
  error,
  onNavigate,
}) => {
  return (
    <div className="space-y-6">
      {/* Telemetry / Backend Connectivity */}
      <SystemStatus
        health={health}
        latencyMs={latencyMs}
        config={providerConfig}
        error={error}
      />

      {/* Primary KPI Metrics */}
      <MetricsGrid metrics={metrics} />

      {/* Recent Evaluations Table */}
      <RecentEvaluations
        evaluations={recentEvaluations}
        onNavigateToPlayground={() => onNavigate('playground')}
        onSelectEvaluation={() => onNavigate('evaluations')}
      />
    </div>
  );
};
