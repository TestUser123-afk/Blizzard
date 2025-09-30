import { NextRequest, NextResponse } from 'next/server';

function decodeUrl(encodedUrl: string): string {
  try {
    // Try base64 decode first (URL-safe base64)
    const base64 = encodedUrl.replace(/[-_]/g, (char) => {
      return char === '-' ? '+' : '/';
    });
    const padded = base64 + '==='.slice(0, (4 - base64.length % 4) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    if (decoded.startsWith('http')) {
      return decoded;
    }
  } catch {}

  try {
    // Try URL decode
    return decodeURIComponent(encodedUrl);
  } catch {}

  // Return as-is if no encoding detected
  return encodedUrl;
}

export async function GET(request: NextRequest) {
  try {
    // Get the target URL from query parameters (support both direct and obfuscated)
    const { searchParams } = new URL(request.url);
    const targetParam = searchParams.get('url') || searchParams.get('u') || searchParams.get('q');

    if (!targetParam) {
      return NextResponse.json(
        { error: 'URL parameter is required (use url, u, or q)' },
        { status: 400 }
      );
    }

    // Decode the URL if it's encoded
    let targetUrl = decodeUrl(targetParam);

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Smart URL handling: if it's not a valid URL, treat it as a search query
    let validUrl: URL;
    try {
      validUrl = new URL(targetUrl);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      // If it's not a valid URL, check if it looks like a search query
      if (!targetUrl.includes('://') && !targetUrl.startsWith('/')) {
        // Convert search query to Google search URL
        const searchQuery = encodeURIComponent(targetUrl);
        targetUrl = `https://www.google.com/search?q=${searchQuery}`;

        try {
          validUrl = new URL(targetUrl);
        } catch {
          return NextResponse.json(
            { error: `Invalid URL format. Failed to parse: ${targetParam}. Attempted Google search for: ${targetUrl}` },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: `Invalid URL format. Failed to parse: ${targetUrl}` },
          { status: 400 }
        );
      }
    }

    // Educational note: These headers might help avoid some basic detection
    const proxyHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    // Fetch the target website
    const response = await fetch(validUrl.toString(), {
      headers: proxyHeaders,
      // Educational: Some filters check request timing patterns
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const content = await response.text();
    const contentType = response.headers.get('content-type') || 'text/html';

    // Educational: Log the request for analysis (in real scenarios, be careful with logs)
    console.log(`Proxied request to: ${targetUrl}`);
    console.log(`Response status: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);

    // Return the proxied content with appropriate headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Educational: CORS headers to allow frontend access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Educational: This header might be detected by sophisticated filters
        'X-Proxy-Source': 'educational-proxy',
        // Educational: Some filters look for cache-control patterns
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url: targetUrl, method = 'GET', headers: customHeaders = {} } = body;

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'URL is required in request body' },
        { status: 400 }
      );
    }

    // Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(targetUrl);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Merge custom headers with defaults
    const proxyHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...customHeaders,
    };

    const response = await fetch(validUrl.toString(), {
      method,
      headers: proxyHeaders,
      signal: AbortSignal.timeout(10000),
    });

    const content = await response.text();
    const contentType = response.headers.get('content-type') || 'text/html';

    console.log(`Proxied ${method} request to: ${targetUrl}`);

    return new NextResponse(content, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Proxy-Source': 'educational-proxy',
      },
    });

  } catch (error) {
    console.error('Proxy POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
