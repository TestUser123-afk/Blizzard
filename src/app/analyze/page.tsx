'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AnalysisResult {
  url: string;
  timestamp: string;
  tests: Array<{
    name: string;
    description: string;
    success: boolean;
    responseTime: number;
    headers: Record<string, string>;
    statusCode?: number;
    error?: string;
    detectionRisk: 'Low' | 'Medium' | 'High';
  }>;
  analysis: {
    totalTests: number;
    successfulTests: number;
    successRate: string;
    averageResponseTime: number;
    detectionPatterns: {
      lowRisk: number;
      mediumRisk: number;
      highRisk: number;
    };
    recommendations: string[];
  };
}

export default function AnalyzePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!url) {
      alert('Please enter a URL to analyze');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/analyze?url=${encodeURIComponent(url)}`);

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Proxy Behavior Analysis
              </h1>
              <p className="text-gray-600">
                Detailed analysis of proxy detection patterns and filter evasion techniques
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              ← Back to Proxy Tester
            </Link>
          </div>

          {/* URL Input */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-purple-900 mb-3">
              Run Comprehensive Analysis
            </h2>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL to analyze (e.g., https://httpbin.org/headers)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            <p className="text-sm text-purple-700 mt-2">
              This will run multiple proxy tests with different detection risk levels.
              <Link href="/" className="underline hover:text-purple-900">
                Use the main tester for iframe viewing.
              </Link>
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="text-red-600 font-medium">❌ Analysis failed</div>
              <p className="text-red-800 mt-1">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  Analysis Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-blue-900">{result.analysis.successRate}</div>
                    <div className="text-blue-700">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-900">{result.analysis.averageResponseTime}ms</div>
                    <div className="text-blue-700">Avg Response Time</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-900">{result.analysis.successfulTests}/{result.analysis.totalTests}</div>
                    <div className="text-blue-700">Tests Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-900">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-blue-700">Analysis Time</div>
                  </div>
                </div>
              </div>

              {/* Detection Risk Breakdown */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Detection Risk Breakdown
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-green-100 rounded">
                    <div className="font-bold text-green-800 text-xl">
                      {result.analysis.detectionPatterns.lowRisk}
                    </div>
                    <div className="text-green-700">Low Risk Success</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-100 rounded">
                    <div className="font-bold text-yellow-800 text-xl">
                      {result.analysis.detectionPatterns.mediumRisk}
                    </div>
                    <div className="text-yellow-700">Medium Risk Success</div>
                  </div>
                  <div className="text-center p-3 bg-red-100 rounded">
                    <div className="font-bold text-red-800 text-xl">
                      {result.analysis.detectionPatterns.highRisk}
                    </div>
                    <div className="text-red-700">High Risk Success</div>
                  </div>
                </div>
              </div>

              {/* Detailed Test Results */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-900 p-4 border-b">
                  Detailed Test Results
                </h3>
                <div className="space-y-4 p-4">
                  {result.tests.map((test, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{test.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(test.detectionRisk)}`}>
                            {test.detectionRisk} Risk
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            test.success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                          }`}>
                            {test.success ? '✅ Success' : '❌ Failed'}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm mb-3">{test.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Response Time:</span>
                          <span className="ml-1">{test.responseTime}ms</span>
                        </div>
                        {test.statusCode && (
                          <div>
                            <span className="font-medium text-gray-700">Status Code:</span>
                            <span className="ml-1">{test.statusCode}</span>
                          </div>
                        )}
                        {test.error && (
                          <div className="col-span-2 md:col-span-1">
                            <span className="font-medium text-red-700">Error:</span>
                            <span className="ml-1 text-red-600">{test.error}</span>
                          </div>
                        )}
                      </div>

                      {Object.keys(test.headers).length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                            Response Headers ({Object.keys(test.headers).length})
                          </summary>
                          <div className="mt-2 bg-gray-50 rounded p-2 text-xs">
                            <pre className="whitespace-pre-wrap">
                              {Object.entries(test.headers)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join('\n')}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-900 mb-3">
                  Filter Detection Recommendations
                </h3>
                <ul className="space-y-2 text-sm text-orange-800">
                  {result.analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
