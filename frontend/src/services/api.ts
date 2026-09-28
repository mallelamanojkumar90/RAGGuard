import type { 
  HealthStatus, 
  ProviderConfig, 
  DocumentListResponse, 
  DocumentDetailResponse, 
  DocumentItem,
  RAGQueryRequest,
  RAGQueryResponse,
  EvaluationHistoryResponse,
  BenchmarkReport,
} from '../types';

const API_BASE = '/api';

export interface HealthCheckResult {
  data: HealthStatus | null;
  latencyMs: number;
  error: string | null;
}

export const api = {
  async getHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: HealthStatus = await response.json();
      return { data, latencyMs, error: null };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : 'Unknown connection error';
      return { data: null, latencyMs, error: message };
    }
  },

  async getProviderConfig(): Promise<ProviderConfig | null> {
    try {
      const response = await fetch(`${API_BASE}/config/providers`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },

  // Document Management APIs
  async uploadDocument(file: File): Promise<{ document: DocumentItem; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(errorData.detail || `Upload failed with HTTP ${response.status}`);
    }

    return await response.json();
  },

  async getDocuments(): Promise<DocumentListResponse> {
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch documents`);
    }

    return await response.json();
  },

  async getDocument(id: string): Promise<DocumentDetailResponse> {
    const response = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch document details`);
    }

    return await response.json();
  },

  async deleteDocument(id: string): Promise<{ status: string; id: string; message: string }> {
    const response = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to delete document`);
    }

    return await response.json();
  },

  // RAGGuard Query & Guardrail API
  async askRAG(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    const response = await fetch(`${API_BASE}/rag/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'RAG query failed' }));
      throw new Error(errorData.detail || `Query failed with HTTP ${response.status}`);
    }

    return await response.json();
  },

  // Evaluation History APIs
  async getEvaluationHistory(): Promise<EvaluationHistoryResponse> {
    const response = await fetch(`${API_BASE}/evaluation/results`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch evaluation history`);
    }

    return await response.json();
  },

  async getEvaluationDetail(id: string): Promise<RAGQueryResponse> {
    const response = await fetch(`${API_BASE}/evaluation/results/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch evaluation trace`);
    }

    return await response.json();
  },

  // Phase 6: Benchmark Suite APIs
  async getBenchmarkReport(): Promise<BenchmarkReport | null> {
    try {
      const response = await fetch(`${API_BASE}/evaluation/benchmark`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  },

  async runBenchmark(maxItems?: number): Promise<BenchmarkReport> {
    const url = maxItems
      ? `${API_BASE}/evaluation/run?max_items=${maxItems}`
      : `${API_BASE}/evaluation/run`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Benchmark execution failed' }));
      throw new Error(errorData.detail || `Benchmark failed with HTTP ${response.status}`);
    }

    return await response.json();
  },
};

