'use client';

import { useState } from 'react';
import Link from 'next/link';

// URL obfuscation utilities
function encodeUrl(url: string): string {
  return Buffer.from(url).toString('base64').replace(/[+/=]/g, (char) => {
    switch (char) {
      case '+': return '-';
      case '/': return '_';
      case '=': return '';
      default: return char;
    }
  });
}

function decodeUrl(encoded: string): string {
  // Reverse the character replacements
  const base64 = encoded.replace(/[-_]/g, (char) => {
    return char === '-' ? '+' : '/';
  });

  // Add padding if needed
  const padded = base64 + '==='.slice(0, (4 - base64.length % 4) % 4);

  try {
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch {
    return encoded; // Return original if decode fails
  }
}

function generateObfuscatedUrl(targetUrl: string, baseUrl: string): string {
  const encoded = encodeUrl(targetUrl);
  return `${baseUrl}/api/proxy-frame?u=${encoded}`;
}

export default function ProxyTester() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    content?: string;
    error?: string;
    status?: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'iframe' | 'raw'>('iframe');
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [useObfuscation, setUseObfuscation] = useState(true);
  const [obfuscatedLink, setObfuscatedLink] = useState<string>('');

  const testProxy = async () => {
    if (!url) {
      alert('Please enter a URL to test');
      return;
    }

    setLoading(true);
    setResult(null);
    setIframeUrl('');
    setObfuscatedLink('');

    if (viewMode === 'iframe') {
      // Create iframe URL with or without obfuscation
      let iframeProxyUrl: string;
      if (useObfuscation) {
        const encoded = encodeUrl(url);
        iframeProxyUrl = `/api/proxy-frame?u=${encoded}`;
        setObfuscatedLink(window.location.origin + iframeProxyUrl);
      } else {
        iframeProxyUrl = `/api/proxy-frame?url=${encodeURIComponent(url)}`;
        setObfuscatedLink('');
      }

      setIframeUrl(iframeProxyUrl);

      try {
        // Test if the proxy works by making a HEAD request
        const testResponse = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);

        setResult({
          success: testResponse.ok,
          status: testResponse.status,
          error: testResponse.ok ? undefined : `Failed to connect: ${testResponse.status}`,
        });
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : 'Network error',
        });
      }
    } else {
      // Raw content mode (original functionality)
      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);

        if (response.ok) {
          const content = await response.text();
          setResult({
            success: true,
            content: content.substring(0, 1000) + (content.length > 1000 ? '...' : ''),
            status: response.status,
          });
        } else {
          const errorData = await response.json();
          setResult({
            success: false,
            error: errorData.error || 'Unknown error',
            status: response.status,
          });
        }
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : 'Network error',
        });
      }
    }

    setLoading(false);
  };

  const testUrls = [
    'https://www.google.com/search?q=test+query',
    'https://httpbin.org/headers',
    'https://httpbin.org/user-agent',
    'https://example.com',
    'https://httpstat.us/200',
    'https://www.bing.com/search?q=proxy+test',
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Web Proxy API Tester
              </h1>
              <p className="text-gray-600">
                Educational tool for testing web proxy functionality and filter detection
              </p>
            </div>
            <Link
              href="/analyze"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Advanced Analysis →
            </Link>
          </div>

          {/* URL Input Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              Test Proxy Request
            </h2>
            <div className="space-y-3 mb-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL to proxy (e.g., https://www.google.com/search?q=test)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={testProxy}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Testing...' : 'Test Proxy'}
                </button>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-sm text-gray-600">View mode:</span>
                <button
                  onClick={() => setViewMode('iframe')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === 'iframe'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📱 Live Iframe
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === 'raw'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📄 Raw Content
                </button>

                {viewMode === 'iframe' && (
                  <>
                    <span className="text-sm text-gray-600 ml-4">|</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={useObfuscation}
                        onChange={(e) => setUseObfuscation(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-gray-700">🔒 Obfuscate URL</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Quick tests:</span>
              {testUrls.map((testUrl) => (
                <button
                  key={testUrl}
                  onClick={() => setUrl(testUrl)}
                  className="text-sm px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                >
                  {testUrl.includes('google.com') ? '🔍 Google Search' :
                   testUrl.includes('bing.com') ? '🔍 Bing Search' :
                   testUrl.replace('https://', '').split('/')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Obfuscated Link Display */}
          {obfuscatedLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                🔒 Obfuscated Proxy Link Generated
              </h3>
              <p className="text-sm text-green-700 mb-2">
                This link hides the target URL from the address bar - perfect for testing URL-based filters:
              </p>
              <div className="bg-white border rounded p-3 break-all">
                <code className="text-xs text-gray-800">{obfuscatedLink}</code>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copyToClipboard(obfuscatedLink)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  📋 Copy Link
                </button>
                <button
                  onClick={() => window.open(obfuscatedLink, '_blank')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  🔗 Open in New Tab
                </button>
              </div>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <div className="bg-gray-50 border rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-3">
                Proxy Result {result.status && `(Status: ${result.status})`}
              </h3>

              {result.success ? (
                <div>
                  <div className="text-green-600 font-medium mb-2">
                    ✅ Proxy request successful! {useObfuscation && viewMode === 'iframe' ? '(URL Obfuscated)' : ''}
                  </div>

                  {viewMode === 'iframe' && iframeUrl ? (
                    <div className="bg-white border rounded overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 border-b text-sm text-gray-600 flex justify-between items-center">
                        <span>Live preview - Your filter agent should see this traffic pattern</span>
                        {useObfuscation && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                            🔒 URL Hidden
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <iframe
                          src={iframeUrl}
                          className="w-full h-96 border-0"
                          title="Proxied Content"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation allow-navigation"
                          onLoad={() => console.log('Iframe loaded successfully')}
                        />
                        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          🔍 Iframe Proxy Active {useObfuscation ? '• URL Obfuscated' : ''}
                        </div>
                      </div>
                      <div className="bg-gray-50 px-3 py-2 border-t text-xs text-gray-500">
                        {useObfuscation ? (
                          <div>
                            <div>Obfuscated URL: {iframeUrl}</div>
                            <div className="text-green-600 mt-1">Original URL hidden from address bar ✓</div>
                          </div>
                        ) : (
                          <div>Direct URL: {iframeUrl}</div>
                        )}
                      </div>
                    </div>
                  ) : viewMode === 'raw' && result.content ? (
                    <div className="bg-white border rounded p-3">
                      <p className="text-sm text-gray-600 mb-2">
                        Content preview (first 1000 characters):
                      </p>
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                        {result.content}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  <div className="text-red-600 font-medium mb-2">
                    ❌ Proxy request failed
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-red-800">{result.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Educational Information */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">
              🎓 Educational Notes
            </h3>
            <div className="space-y-2 text-sm text-yellow-800">
              <p>
                <strong>How this proxy works:</strong> Your browser → This API → Target website → Back to you
              </p>
              <p>
                <strong>Iframe vs Raw modes:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Live Iframe:</strong> Shows the actual rendered website in an embedded frame (most realistic)</li>
                <li><strong>Raw Content:</strong> Displays the HTML source code for technical analysis</li>
              </ul>
              <p>
                <strong>URL Obfuscation:</strong> Base64 encodes the target URL to hide it from address bar and URL-based filters
              </p>
              <p>
                <strong>Google Search fixes:</strong> Enhanced headers, user-agent rotation, and anti-bot detection bypasses
              </p>
              <p>
                <strong>Navigation Interception:</strong> All links, forms, and dynamic navigation stay within the proxy automatically
              </p>
              <p>
                <strong>Filter detection techniques to test:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>User-Agent header analysis and rotation detection</li>
                <li>Request timing patterns</li>
                <li>Custom headers (X-Proxy-Source, X-Original-URL, X-Proxy-User-Agent, X-Proxy-Navigation)</li>
                <li>URL obfuscation and base64 encoding patterns</li>
                <li>Navigation interception and JavaScript injection patterns</li>
                <li>Form submission redirection through proxy</li>
                <li>IP address reputation</li>
                <li>SSL certificate inspection</li>
                <li>Content analysis and modification detection</li>
                <li>Iframe embedding patterns and X-Frame-Options bypass</li>
              </ul>
              <p>
                <strong>Test suggestions:</strong> Search on Google through the proxy - all searches and clicks will stay proxied! Perfect for testing comprehensive navigation filters.
              </p>
            </div>
          </div>

          {/* API Documentation */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              📚 API Usage
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Raw Content API:</strong>
                <code className="block bg-gray-200 p-2 rounded mt-1">
                  GET /api/proxy?url=https://example.com
                </code>
              </div>
              <div>
                <strong>Iframe Content API (Direct):</strong>
                <code className="block bg-gray-200 p-2 rounded mt-1">
                  GET /api/proxy-frame?url=https://example.com
                </code>
              </div>
              <div>
                <strong>Iframe Content API (Obfuscated):</strong>
                <code className="block bg-gray-200 p-2 rounded mt-1">
                  GET /api/proxy-frame?u=aHR0cHM6Ly9leGFtcGxlLmNvbQ
                </code>
                <p className="text-xs text-gray-600 mt-1">Where 'u' parameter contains base64-encoded URL</p>
              </div>
              <div>
                <strong>POST Request (Raw):</strong>
                <pre className="bg-gray-200 p-2 rounded mt-1 overflow-x-auto">
{`POST /api/proxy
Content-Type: application/json

{
  "url": "https://example.com",
  "method": "GET",
  "headers": {
    "Custom-Header": "value"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
