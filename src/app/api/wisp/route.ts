import { NextRequest, NextResponse } from 'next/server';

// WISP (WebSocket over HTTP) protocol implementation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method = 'GET', headers = {}, body: requestBody, protocol = 'http' } = body;

    if (!url) {
      return NextResponse.json({
        error: 'URL is required',
        protocol: 'wisp'
      }, { status: 400 });
    }

    // Parse and validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({
        error: 'Invalid URL format',
        protocol: 'wisp'
      }, { status: 400 });
    }

    // WISP protocol headers (simulated WebSocket upgrade)
    const wispHeaders: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-WebSocket-Version': '13',
      'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
      ...headers
    };

    // Remove problematic headers
    const finalHeaders: Record<string, string> = { ...wispHeaders as Record<string, string> };
    delete finalHeaders['host'];
    delete finalHeaders['origin'];
    delete finalHeaders['connection'];
    delete finalHeaders['upgrade'];

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: finalHeaders,
      redirect: 'follow'
    };

    if (requestBody && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      fetchOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    }

    console.log(`[WISP] Proxying ${method} request to: ${url} via ${protocol}`);

    const response = await fetch(targetUrl, fetchOptions);

    // Handle WebSocket upgrade simulation
    if (targetUrl.protocol === 'ws:' || targetUrl.protocol === 'wss:') {
      return NextResponse.json({
        success: true,
        protocol: 'wisp',
        message: 'WebSocket connection simulated',
        url: url,
        status: 'connected'
      }, {
        headers: {
          'X-WISP-Protocol': '1.0',
          'X-WISP-Connection': 'upgrade',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Read response data
    const responseData = await response.text();

    // Create WISP response headers
    const responseHeaders = new Headers();

    // Copy response headers
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'upgrade'].includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    });

    // Add WISP protocol headers
    responseHeaders.set('X-WISP-Protocol', '1.0');
    responseHeaders.set('X-WISP-Server', 'Blizzard-WISP/1.0');
    responseHeaders.set('X-WISP-Status', response.status.toString());
    responseHeaders.set('X-WISP-Method', method.toUpperCase());

    // Enhanced CORS for WebSocket simulation
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, CONNECT');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Expose-Headers', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');

    return new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[WISP] Error:', error);

    return NextResponse.json({
      error: 'WISP proxy failed',
      protocol: 'wisp',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'X-WISP-Protocol': '1.0',
        'X-WISP-Error': 'true',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const protocol = searchParams.get('protocol') || 'http';

  if (!url) {
    return NextResponse.json({
      error: 'URL parameter required',
      protocol: 'wisp',
      usage: 'GET /api/wisp?url=https://example.com&protocol=http'
    }, { status: 400 });
  }

  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ url, method: 'GET', protocol })
  }));
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD, CONNECT',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
      'X-WISP-Protocol': '1.0',
      'X-WISP-Server': 'Blizzard-WISP/1.0',
      'X-WISP-Features': 'websocket-simulation,http-proxy,cors-bypass'
    },
  });
}

// WISP protocol info endpoint
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-WISP-Protocol': '1.0',
      'X-WISP-Server': 'Blizzard-WISP/1.0',
      'X-WISP-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD, CONNECT',
      'X-WISP-Features': 'websocket-simulation,http-proxy,cors-bypass',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
