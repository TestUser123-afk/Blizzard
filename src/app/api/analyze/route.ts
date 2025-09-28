import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL
    const validUrl = new URL(targetUrl);
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      throw new Error('Invalid protocol');
    }

    // Perform multiple requests with different techniques
    const results = {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      tests: [] as Array<{
        name: string;
        description: string;
        success: boolean;
        responseTime: number;
        headers: Record<string, string>;
        statusCode?: number;
        error?: string;
        detectionRisk: 'Low' | 'Medium' | 'High';
      }>,
    };

    // Test 1: Standard proxy request
    const startTime1 = Date.now();
    try {
      const response1 = await fetch(validUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(5000),
      });

      results.tests.push({
        name: 'Standard Proxy',
        description: 'Basic proxy request with common User-Agent',
        success: response1.ok,
        responseTime: Date.now() - startTime1,
        headers: Object.fromEntries(response1.headers.entries()),
        statusCode: response1.status,
        detectionRisk: 'Medium',
      });
    } catch (error) {
      results.tests.push({
        name: 'Standard Proxy',
        description: 'Basic proxy request with common User-Agent',
        success: false,
        responseTime: Date.now() - startTime1,
        headers: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        detectionRisk: 'Medium',
      });
    }

    // Test 2: Stealth proxy request
    const startTime2 = Date.now();
    try {
      const response2 = await fetch(validUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
        },
        signal: AbortSignal.timeout(5000),
      });

      results.tests.push({
        name: 'Stealth Proxy',
        description: 'Request with comprehensive browser-like headers',
        success: response2.ok,
        responseTime: Date.now() - startTime2,
        headers: Object.fromEntries(response2.headers.entries()),
        statusCode: response2.status,
        detectionRisk: 'Low',
      });
    } catch (error) {
      results.tests.push({
        name: 'Stealth Proxy',
        description: 'Request with comprehensive browser-like headers',
        success: false,
        responseTime: Date.now() - startTime2,
        headers: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        detectionRisk: 'Low',
      });
    }

    // Test 3: Obvious proxy request (for detection testing)
    const startTime3 = Date.now();
    try {
      const response3 = await fetch(validUrl.toString(), {
        headers: {
          'User-Agent': 'Educational-Proxy-Bot/1.0',
          'X-Forwarded-For': '127.0.0.1',
          'X-Proxy-Connection': 'keep-alive',
          'Via': '1.1 educational-proxy',
        },
        signal: AbortSignal.timeout(5000),
      });

      results.tests.push({
        name: 'Obvious Proxy',
        description: 'Request with obvious proxy headers for filter testing',
        success: response3.ok,
        responseTime: Date.now() - startTime3,
        headers: Object.fromEntries(response3.headers.entries()),
        statusCode: response3.status,
        detectionRisk: 'High',
      });
    } catch (error) {
      results.tests.push({
        name: 'Obvious Proxy',
        description: 'Request with obvious proxy headers for filter testing',
        success: false,
        responseTime: Date.now() - startTime3,
        headers: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        detectionRisk: 'High',
      });
    }

    // Add analysis summary
    const successfulTests = results.tests.filter(test => test.success).length;
    const analysis = {
      totalTests: results.tests.length,
      successfulTests,
      successRate: `${Math.round((successfulTests / results.tests.length) * 100)}%`,
      averageResponseTime: Math.round(
        results.tests
          .filter(test => test.success)
          .reduce((sum, test) => sum + test.responseTime, 0) /
        Math.max(successfulTests, 1)
      ),
      detectionPatterns: {
        lowRisk: results.tests.filter(test => test.detectionRisk === 'Low' && test.success).length,
        mediumRisk: results.tests.filter(test => test.detectionRisk === 'Medium' && test.success).length,
        highRisk: results.tests.filter(test => test.detectionRisk === 'High' && test.success).length,
      },
      recommendations: [
        'Monitor server logs for requests with "Educational-Proxy-Bot" User-Agent',
        'Check for X-Forwarded-For and Via headers',
        'Analyze response time patterns (proxies often have higher latency)',
        'Look for unusual header combinations',
        'Monitor for requests missing common browser headers',
      ],
    };

    return NextResponse.json({ ...results, analysis });

  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid URL or analysis failed' },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
