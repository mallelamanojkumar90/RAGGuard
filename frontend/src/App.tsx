import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/Dashboard';
import { DocumentsPage } from './pages/Documents';
import { PlaygroundPage } from './pages/Playground';
import { EvaluationsPage } from './pages/Evaluations';
import { BenchmarkPage } from './pages/Benchmark';
import { SettingsPage } from './pages/Settings';
import { api } from './services/api';
import type { 
  NavTab, 
  HealthStatus, 
  ProviderConfig, 
  DashboardMetrics, 
  RecentEvaluationItem 
} from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic dashboard metrics state
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    documentsIndexed: 0,
    questionsEvaluated: 0,
    passRate: 0.0,
    warningRate: 0.0,
    blockRate: 0.0,
    detectedUnsupportedAnswers: 0,
  });

  const [recentEvaluations, setRecentEvaluations] = useState<RecentEvaluationItem[]>([]);

  const fetchBackendStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const healthRes = await api.getHealth();
      setLatencyMs(healthRes.latencyMs);
      if (healthRes.error) {
        setError(healthRes.error);
        setHealth(null);
      } else {
        setHealth(healthRes.data);
        setError(null);
      }

      const configRes = await api.getProviderConfig();
      if (configRes) {
        setProviderConfig(configRes);
      }

      // Sync document metrics
      let docCount = 0;
      try {
        const docsRes = await api.getDocuments();
        const indexedDocs = docsRes.documents.filter((d) => d.status === 'Indexed');
        docCount = indexedDocs.length;
      } catch {
        // Ignore doc fetch error if backend starting
      }

      // Sync evaluation history metrics
      try {
        const evalRes = await api.getEvaluationHistory();
        const total = evalRes.total_evaluations;
        const passRate = total > 0 ? (evalRes.pass_count / total) * 100 : 0.0;
        const warningRate = total > 0 ? (evalRes.warn_count / total) * 100 : 0.0;
        const blockRate = total > 0 ? (evalRes.block_count / total) * 100 : 0.0;

        setMetrics({
          documentsIndexed: docCount,
          questionsEvaluated: total,
          passRate,
          warningRate,
          blockRate,
          detectedUnsupportedAnswers: evalRes.unsupported_detected_count,
        });

        // Format recent evaluations table
        const recentItems: RecentEvaluationItem[] = evalRes.evaluations.slice(0, 10).map((e) => ({
          id: e.id,
          timestamp: new Date(e.timestamp).toLocaleTimeString(),
          question: e.question,
          decision: e.final_decision,
          confidence: e.final_evaluation?.confidence,
          severity: e.final_evaluation?.severity,
          unsupportedClaimsCount: e.final_evaluation?.unsupported_claims?.length || 0,
          latencyMs: e.total_latency_ms,
        }));
        setRecentEvaluations(recentItems);
      } catch {
        setMetrics((prev) => ({ ...prev, documentsIndexed: docCount }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendStatus();
    // Poll telemetry periodically
    const interval = setInterval(fetchBackendStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchBackendStatus]);

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            metrics={metrics}
            recentEvaluations={recentEvaluations}
            health={health}
            latencyMs={latencyMs}
            providerConfig={providerConfig}
            error={error}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'documents':
        return <DocumentsPage />;
      case 'playground':
        return <PlaygroundPage />;
      case 'evaluations':
        return <EvaluationsPage />;
      case 'benchmark':
        return <BenchmarkPage />;
      case 'settings':
        return (
          <SettingsPage
            health={health}
            config={providerConfig}
            latencyMs={latencyMs}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      health={health}
      latencyMs={latencyMs}
      providerConfig={providerConfig}
      isLoading={isLoading}
      onRefresh={fetchBackendStatus}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
