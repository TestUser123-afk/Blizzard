import { NextRequest, NextResponse } from 'next/server';

// Bare server protocol implementation for proxy testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method = 'GET', headers = {}, body: requestBody } = body;

    if (!url) {
      return NextResponse.json({
        error: 'URL is required',
        protocol: 'bare-server'
      }, { status: 400 });
    }

    // Validate URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({
        error: 'Invalid URL format',
        protocol: 'bare-server'
      }, { status: 400 });
    }

    // Create Bare-compliant headers
    const bareHeaders: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      ...headers
    };

    // Remove headers that could cause issues
    const finalHeaders: Record<string, string> = { ...bareHeaders as Record<string, string> };
    delete finalHeaders['host'];
    delete finalHeaders['origin'];
    delete finalHeaders['referer'];

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: finalHeaders,
      redirect: 'follow'
    };

    if (requestBody && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      fetchOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    }

    console.log(`[Bare Server] Proxying ${method} request to: ${url}`);

    const response = await fetch(targetUrl, fetchOptions);

    // Read response
    const responseText = await response.text();

    // Create response headers
    const responseHeaders = new Headers();

    // Copy safe response headers
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    });

    // Add Bare server identification headers
    responseHeaders.set('X-Bare-Server', 'Blizzard/1.0');
    responseHeaders.set('X-Bare-Protocol', '1.0.0');
    responseHeaders.set('X-Bare-Status', response.status.toString());

    // CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Expose-Headers', '*');

    // Return Bare-compliant response
    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[Bare Server] Error:', error);

    return NextResponse.json({
      error: 'Bare server proxy failed',
      protocol: 'bare-server',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'X-Bare-Server': 'Blizzard/1.0',
        'X-Bare-Error': 'true',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({
      error: 'URL parameter required',
      protocol: 'bare-server',
      usage: 'GET /api/bare?url=https://example.com'
    }, { status: 400 });
  }

  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ url, method: 'GET' })
  }));
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
      'X-Bare-Server': 'Blizzard/1.0',
      'X-Bare-Protocol': '1.0.0'
    },
  });
}

// Bare server info endpoint
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Bare-Server': 'Blizzard/1.0',
      'X-Bare-Protocol': '1.0.0',
      'X-Bare-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
