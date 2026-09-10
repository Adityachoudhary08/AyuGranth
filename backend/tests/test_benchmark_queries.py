"""
Benchmark Queries Test Script.

Loads a set of benchmark Q&A pairs and runs them against the /ask endpoint.
Prints a summary table showing pass/fail on citation-presence and abstention-correctness.
"""

import asyncio
import os
import sys

# Add the parent directory so we can import the FastAPI app's dependencies
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.rag_pipeline import run_rag_query

# Mock set of benchmark queries (covering different categories)
BENCHMARK_QUERIES = [
    {
        "id": "1",
        "category": "Patents Act",
        "query": "Is a traditional formulation of Ashwagandha and milk patentable under Section 3(p)?",
        "expect_abstain": False,
        "expect_citation": True
    },
    {
        "id": "2",
        "category": "ABS",
        "query": "Do I need NBA approval to use Turmeric sourced from Kerala for a patent?",
        "expect_abstain": False,
        "expect_citation": True
    },
    {
        "id": "3",
        "category": "GI",
        "query": "Can I register a Geographical Indication for a generic herbal tea made in Delhi?",
        "expect_abstain": False,
        "expect_citation": True
    },
    {
        "id": "4",
        "category": "Out-of-Scope",
        "query": "How do I fix the alternator on a 2005 Honda Civic?",
        "expect_abstain": True,
        "expect_citation": False
    },
    {
        "id": "5",
        "category": "Export",
        "query": "What are the FDA DSHEA requirements for exporting a dietary supplement?",
        "expect_abstain": False,
        "expect_citation": True
    }
]


from core.database import connect_db, close_db

async def run_benchmark():
    # Connect to the database before running queries
    await connect_db()
    try:
        print(f"{'ID':<4} | {'Category':<15} | {'Abstention Correct':<20} | {'Citation Present':<20} | {'Result':<10}")
        print("-" * 80)
        
        passed_count = 0
        
        for item in BENCHMARK_QUERIES:
            query = item["query"]
            try:
                # We use the internal RAG function directly to bypass auth/DB setup for simple testing
                result = await run_rag_query(query)
                
                abstained = result.get("should_abstain", False)
                citations = result.get("verified_claims", [])
                
                # Evaluate metrics
                abstention_correct = (abstained == item["expect_abstain"])
                
                if item["expect_citation"]:
                    citation_present = len(citations) > 0 and not abstained
                else:
                    citation_present = len(citations) == 0 or abstained
                    
                passed = abstention_correct and citation_present
                if passed:
                    passed_count += 1
                    
                print(f"{item['id']:<4} | {item['category']:<15} | {str(abstention_correct):<20} | {str(citation_present):<20} | {'PASS' if passed else 'FAIL':<10}")
                
            except Exception as e:
                print(f"{item['id']:<4} | {item['category']:<15} | {'ERROR':<20} | {'ERROR':<20} | {'FAIL':<10}")
                print(f"  Error details: {e}")

        print("-" * 80)
        print(f"Summary: {passed_count}/{len(BENCHMARK_QUERIES)} tests passed ({(passed_count/len(BENCHMARK_QUERIES))*100:.1f}%)")
    finally:
        await close_db()


if __name__ == "__main__":
    print("Running Benchmark Queries...")
    asyncio.run(run_benchmark())
