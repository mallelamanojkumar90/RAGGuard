import os
import sys
import json
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

# Ensure project root is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.models.schemas import (
    RAGQueryRequest,
    RAGQueryResponse,
    SourceCitation,
    DecisionVerdict,
)
from app.rag.pipeline import rag_pipeline, build_rag_prompt
from app.services.rag_service import rag_service
from app.llm.factory import get_llm_provider
from app.evaluation.pipeline import evaluation_pipeline
from app.core.logging import logger

DATA_DIR = ROOT_DIR / "data"
BENCHMARK_RESULTS_FILE = DATA_DIR / "benchmark_results.json"
DATASET_FILE = ROOT_DIR / "evaluation" / "dataset.json"


def load_dataset() -> List[Dict[str, Any]]:
    if not DATASET_FILE.exists():
        raise FileNotFoundError(f"Evaluation dataset not found at {DATASET_FILE}")
    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


async def evaluate_single_item(
    item: Dict[str, Any],
    llm_provider,
) -> Dict[str, Any]:
    question = item["question"]
    reference_context = item.get("reference_context", "")
    ground_truth_unsupported = item.get("ground_truth_unsupported", False)
    category = item.get("category", "general")

    mock_citation = SourceCitation(
        chunk_id=f"ref_{item['id']}",
        document_id=f"doc_{item['id']}",
        document_name=item.get("source_reference", "benchmark_corpus.pdf"),
        page_number=1,
        chunk_index=0,
        content=reference_context,
        similarity_score=0.92,
    )

    # -------------------------------------------------------------
    # 1. Baseline Run: Raw RAG -> LLM -> Answer (No guardrail)
    # -------------------------------------------------------------
    baseline_start = time.perf_counter()
    baseline_prompt = build_rag_prompt(question, [mock_citation])
    baseline_answer = await llm_provider.generate_answer(baseline_prompt)
    baseline_latency_ms = round((time.perf_counter() - baseline_start) * 1000, 2)

    # Determine if baseline answer is hallucinated / unsupported
    # Honest refusal is considered supported; answering unanswerable with external facts is unsupported
    ans_lower = baseline_answer.lower()
    is_refusal = (
        "not contain enough information" in ans_lower or
        "does not mention" in ans_lower or
        "not enough information" in ans_lower or
        "cannot be determined" in ans_lower
    )
    baseline_was_unsupported = ground_truth_unsupported and not is_refusal

    # -------------------------------------------------------------
    # 2. RAGGuard Run: RAG -> LLM -> Jev -> Decision -> Self-Correction
    # -------------------------------------------------------------
    guard_start = time.perf_counter()
    req = RAGQueryRequest(
        question=question,
        top_k=2,
        enable_guardrail=True,
    )
    # Run full RAGGuard flow with Jev
    ragguard_res = await rag_service.query_rag(
        req,
        provider_name=llm_provider.provider_name,
        model_name=llm_provider.model_name,
        citations_override=[mock_citation],
    )
    guard_latency_ms = round((time.perf_counter() - guard_start) * 1000, 2)

    final_decision = ragguard_res.final_decision
    final_answer = ragguard_res.final_answer
    regen_count = ragguard_res.regeneration_attempts

    # Check if RAGGuard flagged / blocked an unsupported answer
    flagged_by_ragguard = (
        (ragguard_res.initial_decision in [DecisionVerdict.BLOCK, DecisionVerdict.WARN]) or
        (final_decision in [DecisionVerdict.BLOCK, DecisionVerdict.WARN]) or
        (regen_count > 0)
    )
    final_is_unsupported = (final_decision == DecisionVerdict.BLOCK)

    # -------------------------------------------------------------
    # 3. Confusion Matrix Categorization (against ground-truth unsupported status)
    # -------------------------------------------------------------
    # Is the baseline question inherently prone to unsupported answer?
    is_actually_unsupported = baseline_was_unsupported or ground_truth_unsupported

    if is_actually_unsupported:
        if flagged_by_ragguard:
            cm_label = "TP"  # True Positive: Bad answer correctly caught/flagged
        else:
            cm_label = "FN"  # False Negative: Bad answer slipped through
    else:
        if flagged_by_ragguard:
            cm_label = "FP"  # False Positive: False alarm on a grounded answer
        else:
            cm_label = "TN"  # True Negative: Grounded answer correctly passed

    return {
        "id": item["id"],
        "category": category,
        "question": question,
        "expected_answer": item.get("expected_answer", ""),
        "baseline_answer": baseline_answer,
        "baseline_was_unsupported": baseline_was_unsupported,
        "baseline_latency_ms": baseline_latency_ms,
        "ragguard_final_answer": final_answer,
        "ragguard_initial_decision": ragguard_res.initial_decision.value,
        "ragguard_final_decision": final_decision.value,
        "ragguard_regenerations": regen_count,
        "ragguard_latency_ms": guard_latency_ms,
        "cm_label": cm_label,
        "ground_truth_unsupported": ground_truth_unsupported,
    }


async def run_benchmark(
    max_items: Optional[int] = None,
    provider_name: Optional[str] = None,
) -> Dict[str, Any]:
    dataset = load_dataset()
    if max_items:
        dataset = dataset[:max_items]

    llm = get_llm_provider(provider_name=provider_name)
    logger.info(f"Starting Benchmark run with {len(dataset)} items using '{llm.provider_name}'...")

    results: List[Dict[str, Any]] = []
    for item in dataset:
        res = await evaluate_single_item(item, llm)
        results.append(res)

    total = len(results)
    tp = sum(1 for r in results if r["cm_label"] == "TP")
    fp = sum(1 for r in results if r["cm_label"] == "FP")
    tn = sum(1 for r in results if r["cm_label"] == "TN")
    fn = sum(1 for r in results if r["cm_label"] == "FN")

    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 1.0
    recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 1.0
    f1_score = round(2 * (precision * recall) / (precision + recall), 4) if (precision + recall) > 0 else 0.0
    fpr = round(fp / (fp + tn), 4) if (fp + tn) > 0 else 0.0

    baseline_unsupported_count = sum(1 for r in results if r["baseline_was_unsupported"])
    ragguard_blocked_count = sum(1 for r in results if r["ragguard_final_decision"] == "BLOCK")
    ragguard_warned_count = sum(1 for r in results if r["ragguard_final_decision"] == "WARN")
    ragguard_passed_count = sum(1 for r in results if r["ragguard_final_decision"] == "PASS")

    regen_attempts_total = sum(r["ragguard_regenerations"] for r in results)
    regens_succeeded = sum(
        1 for r in results if r["ragguard_regenerations"] > 0 and r["ragguard_final_decision"] in ["PASS", "WARN"]
    )
    regen_success_rate = (
        round(regens_succeeded / sum(1 for r in results if r["ragguard_regenerations"] > 0), 4)
        if any(r["ragguard_regenerations"] > 0 for r in results) else 1.0
    )

    avg_baseline_latency = round(sum(r["baseline_latency_ms"] for r in results) / total, 2)
    avg_ragguard_latency = round(sum(r["ragguard_latency_ms"] for r in results) / total, 2)

    benchmark_report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_questions": total,
        "provider_used": llm.provider_name,
        "model_used": llm.model_name,
        "metrics": {
            "precision": precision,
            "recall": recall,
            "f1_score": f1_score,
            "false_positive_rate": fpr,
            "baseline_unsupported_rate": round(baseline_unsupported_count / total, 4),
            "ragguard_final_block_rate": round(ragguard_blocked_count / total, 4),
            "ragguard_warning_rate": round(ragguard_warned_count / total, 4),
            "ragguard_pass_rate": round(ragguard_passed_count / total, 4),
            "regeneration_success_rate": regen_success_rate,
            "total_regenerations_triggered": regen_attempts_total,
        },
        "confusion_matrix": {
            "true_positives": tp,
            "false_positives": fp,
            "true_negatives": tn,
            "false_negatives": fn,
        },
        "latencies": {
            "avg_baseline_latency_ms": avg_baseline_latency,
            "avg_ragguard_latency_ms": avg_ragguard_latency,
        },
        "category_breakdown": {
            cat: {
                "total": sum(1 for r in results if r["category"] == cat),
                "blocked": sum(1 for r in results if r["category"] == cat and r["ragguard_final_decision"] == "BLOCK"),
                "passed": sum(1 for r in results if r["category"] == cat and r["ragguard_final_decision"] == "PASS"),
            }
            for cat in set(r["category"] for r in results)
        },
        "test_cases": results,
    }

    # Persist benchmark result
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(BENCHMARK_RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(benchmark_report, f, indent=2)

    logger.info(
        f"Benchmark completed: F1={f1_score}, Precision={precision}, Recall={recall}, FPR={fpr}"
    )
    return benchmark_report


def get_latest_benchmark() -> Optional[Dict[str, Any]]:
    if not BENCHMARK_RESULTS_FILE.exists():
        return None
    try:
        with open(BENCHMARK_RESULTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


if __name__ == "__main__":
    import asyncio
    import argparse

    parser = argparse.ArgumentParser(description="Run RAGGuard evaluation benchmark suite.")
    parser.add_argument("--provider", type=str, default=None, help="LLM provider (mock, ollama, openai, gemini, openrouter)")
    parser.add_argument("--max-items", type=int, default=None, help="Limit number of dataset items to evaluate")
    args = parser.parse_args()

    print(f"Executing RAGGuard Evaluation Benchmark (Provider: {args.provider or 'default'}, Max items: {args.max_items or 'all'})...")
    report = asyncio.run(run_benchmark(max_items=args.max_items, provider_name=args.provider))
    print("\n--- Benchmark Summary ---")
    print(f"Total Questions: {report['total_questions']}")
    print(f"Precision:       {report['metrics']['precision'] * 100:.1f}%")
    print(f"Recall:          {report['metrics']['recall'] * 100:.1f}%")
    print(f"F1 Score:        {report['metrics']['f1_score'] * 100:.1f}%")
    print(f"False Positives: {report['metrics']['false_positive_rate'] * 100:.1f}%")
    print(f"Confusion Matrix: {report['confusion_matrix']}")
    print("Saved to:", BENCHMARK_RESULTS_FILE)

