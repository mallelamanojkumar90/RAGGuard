export type NavTab = 'dashboard' | 'documents' | 'playground' | 'evaluations' | 'benchmark' | 'settings';

export interface HealthStatus {
  status: string;
  app: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface ProviderConfig {
  active_provider: string;
  available_providers: string[];
  vector_db: string;
  embedding_model: string;
  max_retries: number;
  top_k: number;
}

export interface DashboardMetrics {
  documentsIndexed: number;
  questionsEvaluated: number;
  passRate: number;
  warningRate: number;
  blockRate: number;
  detectedUnsupportedAnswers: number;
}

export type DecisionVerdict = 'PASS' | 'WARN' | 'BLOCK';

export interface RecentEvaluationItem {
  id: string;
  timestamp: string;
  question: string;
  decision: DecisionVerdict;
  confidence?: number | null;
  severity?: string | null;
  unsupportedClaimsCount: number;
  latencyMs: number;
}

// --- Phase 2: Document Ingestion Types ---

export type DocumentStatus = 'Uploading' | 'Processing' | 'Indexed' | 'Failed';

export interface DocumentItem {
  id: string;
  filename: string;
  file_size_bytes: number;
  status: DocumentStatus;
  chunk_count: number;
  uploaded_at: string;
  error_message?: string | null;
}

export interface DocumentChunk {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page_number: number;
  chunk_index: number;
  content: string;
  character_count: number;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
  total_documents: number;
  total_chunks: number;
}

export interface DocumentDetailResponse {
  document: DocumentItem;
  chunks: DocumentChunk[];
}

// --- Phase 3 & 4: Evaluation & Guardrail Types ---

export interface SourceCitation {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page_number: number;
  chunk_index: number;
  content: string;
  similarity_score: number;
}

export interface EvaluationResult {
  verdict: DecisionVerdict;
  is_grounded: boolean;
  grounding_probability: number;
  has_hallucinations: boolean;
  confidence?: number | null;
  severity?: string | null;
  grounding_score?: number | null;
  unsupported_claims: string[];
  explanation: string;
  evidence_chunk_ids: string[];
  evaluation_latency_ms: number;
  evaluator_type: string;
  raw_result?: Record<string, any> | null;
}

export interface RegenerationStep {
  attempt: number;
  generated_answer: string;
  decision: DecisionVerdict;
  evaluation: EvaluationResult;
  latency_ms: number;
}

export interface PipelineStageTrace {
  stage: string;
  name: string;
  latency_ms: number;
  status: string;
  details?: Record<string, any> | null;
}

export interface PipelineTrace {
  retrieval_latency_ms: number;
  llm_latency_ms: number;
  evaluation_latency_ms: number;
  regeneration_latency_ms: number;
  total_latency_ms: number;
  stages: PipelineStageTrace[];
}

export interface RAGQueryRequest {
  question: string;
  top_k?: number;
  document_id?: string;
  enable_guardrail?: boolean;
}

export interface RAGQueryResponse {
  id: string;
  timestamp: string;
  question: string;
  answer: string;
  initial_answer: string;
  final_answer: string;
  initial_decision: DecisionVerdict;
  final_decision: DecisionVerdict;
  sources: SourceCitation[];
  initial_evaluation?: EvaluationResult | null;
  final_evaluation?: EvaluationResult | null;
  regeneration_attempts: number;
  regeneration_history: RegenerationStep[];
  pipeline_trace?: PipelineTrace | null;
  retrieval_latency_ms: number;
  llm_latency_ms: number;
  evaluation_latency_ms: number;
  total_latency_ms: number;
  provider_used: string;
  model_used: string;
}

export interface EvaluationHistoryResponse {
  evaluations: RAGQueryResponse[];
  total_evaluations: number;
  pass_count: number;
  warn_count: number;
  block_count: number;
  unsupported_detected_count: number;
}

// --- Phase 6: Benchmark & Quantitative Evaluation Types ---

export interface BenchmarkMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  baseline_unsupported_rate: number;
  ragguard_final_block_rate: number;
  ragguard_warning_rate: number;
  ragguard_pass_rate: number;
  regeneration_success_rate: number;
  total_regenerations_triggered: number;
}

export interface ConfusionMatrix {
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
}

export interface LatencyComparison {
  avg_baseline_latency_ms: number;
  avg_ragguard_latency_ms: number;
}

export interface CategoryStats {
  total: number;
  blocked: number;
  passed: number;
}

export interface BenchmarkTestCase {
  id: string;
  category: string;
  question: string;
  expected_answer: string;
  baseline_answer: string;
  baseline_was_unsupported: boolean;
  baseline_latency_ms: number;
  ragguard_final_answer: string;
  ragguard_initial_decision: DecisionVerdict;
  ragguard_final_decision: DecisionVerdict;
  ragguard_regenerations: number;
  ragguard_latency_ms: number;
  cm_label: 'TP' | 'FP' | 'TN' | 'FN';
  ground_truth_unsupported: boolean;
}

export interface BenchmarkReport {
  timestamp: string;
  total_questions: number;
  provider_used: string;
  model_used: string;
  metrics: BenchmarkMetrics;
  confusion_matrix: ConfusionMatrix;
  latencies: LatencyComparison;
  category_breakdown: Record<string, CategoryStats>;
  test_cases: BenchmarkTestCase[];
}

