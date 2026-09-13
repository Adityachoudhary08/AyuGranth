import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { BarChart, Activity, Cpu, CheckCircle } from 'lucide-react';
import { analyticsApi } from '../../api';
export default function Evaluation() {
  const {
    t
  } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await analyticsApi.getEvaluationMetrics();
        setMetrics(response);
      } catch (err) {
        console.error(err);
        setError('Failed to load evaluation metrics. Make sure you have run the backend benchmarking tests.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);
  return <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[#176B45] mb-2 flex items-center gap-3">
          <BarChart className="w-8 h-8" />{t("evaluation.systemEvaluationMetrics", "System Evaluation Metrics")}</h1>
        <p className="text-[#161412]/60">{t("evaluation.liveperformancemetricsof", "Live performance metrics of the AyuGranth core AI models and retrieval systems.")}</p>
      </div>

      {isLoading && <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#176B45] border-t-transparent animate-spin mb-4" />
          <p className="text-[#161412]/60 font-medium">{t("evaluation.loadingbenchmarkingdata", "Loading benchmarking data...")}</p>
        </div>}

      {error && <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center">
          <p className="font-medium">{error}</p>
        </div>}

      {metrics && <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#161412]/60 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-medium">{t("evaluation.totalBenchmarkQueries", "Total Benchmark Queries")}</h3>
              </div>
              <p className="text-4xl font-serif text-[#161412]">{metrics.total_queries}</p>
            </div>
            
            <div className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#161412]/60 mb-3">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium">{t("evaluation.averageRelevanceScore", "Average Relevance Score")}</h3>
              </div>
              <p className="text-4xl font-serif text-[#161412]">{(metrics.average_relevance * 10).toFixed(1)}<span className="text-xl text-[#161412]/40">/10</span></p>
            </div>

            <div className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#161412]/60 mb-3">
                <Activity className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium">{t("evaluation.averageFaithfulness", "Average Faithfulness")}</h3>
              </div>
              <p className="text-4xl font-serif text-[#161412]">{(metrics.average_faithfulness * 10).toFixed(1)}<span className="text-xl text-[#161412]/40">/10</span></p>
            </div>

            <div className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#161412]/60 mb-3">
                <Cpu className="w-5 h-5 text-orange-600" />
                <h3 className="font-medium">{t("evaluation.averageLatency", "Average Latency")}</h3>
              </div>
              <p className="text-4xl font-serif text-[#161412]">{(metrics.average_latency_ms / 1000).toFixed(2)}<span className="text-xl text-[#161412]/40">s</span></p>
            </div>
          </div>

          <div className="bg-white border border-[#161412]/10 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#161412]/10 bg-[#f8f7f4]">
              <h3 className="font-serif text-lg text-[#161412]">{t("evaluation.detailedQueryEvaluations", "Detailed Query Evaluations")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#161412]/80">
                <thead className="bg-gray-50 border-b border-[#161412]/10 text-xs uppercase tracking-wider text-[#161412]/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">{t("evaluation.query", "Query")}</th>
                    <th className="px-6 py-4 font-medium w-32">{t("evaluation.relevance", "Relevance")}</th>
                    <th className="px-6 py-4 font-medium w-32">{t("evaluation.faithfulness", "Faithfulness")}</th>
                    <th className="px-6 py-4 font-medium w-32">{t("evaluation.latency", "Latency")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161412]/10">
                  {metrics.evaluations.map((evalItem, idx) => <tr key={idx} className="hover:bg-[#161412]/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-[#161412] max-w-md truncate" title={evalItem.query}>
                        {evalItem.query}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8">{(evalItem.relevance_score * 10).toFixed(1)}</span>
                          <div className="flex-1 h-1.5 bg-[#161412]/10 rounded-full">
                            <div className="h-full bg-blue-500 rounded-full" style={{
                        width: `${evalItem.relevance_score * 100}%`
                      }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8">{(evalItem.faithfulness_score * 10).toFixed(1)}</span>
                          <div className="flex-1 h-1.5 bg-[#161412]/10 rounded-full">
                            <div className="h-full bg-purple-500 rounded-full" style={{
                        width: `${evalItem.faithfulness_score * 100}%`
                      }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#161412]/60">
                        {Math.round(evalItem.latency_ms)}{t("evaluation.ms", "ms")}</td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>}
    </div>;
}