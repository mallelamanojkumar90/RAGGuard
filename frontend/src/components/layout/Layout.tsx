import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { HealthStatus, ProviderConfig, NavTab } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  health: HealthStatus | null;
  latencyMs: number;
  providerConfig: ProviderConfig | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentTab,
  onTabChange,
  health,
  latencyMs,
  providerConfig,
  isLoading,
  onRefresh,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <Sidebar
        currentTab={currentTab}
        onTabChange={onTabChange}
        backendOnline={!!health && health.status === 'ok'}
      />
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <Header
          currentTab={currentTab}
          health={health}
          latencyMs={latencyMs}
          providerConfig={providerConfig}
          isLoading={isLoading}
          onRefresh={onRefresh}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
