import { NextRequest, NextResponse } from 'next/server';

// Enhanced user agents for better Google compatibility
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function decodeUrl(encodedUrl: string): string {
  try {
    // Try base64 decode first
    const decoded = Buffer.from(encodedUrl, 'base64').toString('utf-8');
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

function createProxyUrl(targetUrl: string, baseProxyUrl: string): string {
  try {
    const url = new URL(targetUrl);
    const encoded = encodeUrl(url.toString());
    return `${baseProxyUrl}/api/proxy-frame?u=${encoded}`;
  } catch {
    return targetUrl;
  }
}

function rewriteHtmlContent(content: string, originalUrl: URL, baseProxyUrl: string): string {
  const baseUrl = `${originalUrl.protocol}//${originalUrl.host}`;

  let processedContent = content;

  // Fix all href attributes to go through proxy
  processedContent = processedContent.replace(/href=["']([^"']*?)["']/gi, (match, url) => {
    if (url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return match; // Keep anchors, javascript, and special protocols as-is
    }

    let fullUrl: string;
    try {
      if (url.startsWith('//')) {
        fullUrl = originalUrl.protocol + url;
      } else if (url.startsWith('/')) {
        fullUrl = baseUrl + url;
      } else if (url.startsWith('http')) {
        fullUrl = url;
      } else {
        // Relative URL
        const currentPath = originalUrl.pathname.endsWith('/') ? originalUrl.pathname : originalUrl.pathname + '/';
        fullUrl = baseUrl + currentPath + url;
      }

      const proxyUrl = createProxyUrl(fullUrl, baseProxyUrl);
      return `href="${proxyUrl}"`;
    } catch {
      return match;
    }
  });

  // Fix all src attributes for resources
  processedContent = processedContent.replace(/src=["']([^"']*?)["']/gi, (match, url) => {
    if (url.startsWith('data:') || url.startsWith('javascript:')) {
      return match; // Keep data URLs and javascript as-is
    }

    try {
      let fullUrl: string;
      if (url.startsWith('//')) {
        fullUrl = originalUrl.protocol + url;
      } else if (url.startsWith('/')) {
        fullUrl = baseUrl + url;
      } else if (url.startsWith('http')) {
        fullUrl = url;
      } else {
        // Relative URL
        const currentPath = originalUrl.pathname.endsWith('/') ? originalUrl.pathname : originalUrl.pathname + '/';
        fullUrl = baseUrl + currentPath + url;
      }

      return `src="${fullUrl}"`;
    } catch {
      return match;
    }
  });

  // Fix form actions to go through proxy
  processedContent = processedContent.replace(/action=["']([^"']*?)["']/gi, (match, url) => {
    try {
      let fullUrl: string;
      if (url.startsWith('//')) {
        fullUrl = originalUrl.protocol + url;
      } else if (url.startsWith('/')) {
        fullUrl = baseUrl + url;
      } else if (url.startsWith('http')) {
        fullUrl = url;
      } else {
        // Relative URL
        const currentPath = originalUrl.pathname.endsWith('/') ? originalUrl.pathname : originalUrl.pathname + '/';
        fullUrl = baseUrl + currentPath + url;
      }

      const proxyUrl = createProxyUrl(fullUrl, baseProxyUrl);
      return `action="${proxyUrl}"`;
    } catch {
      return match;
    }
  });

  // Fix CSS URLs
  processedContent = processedContent.replace(/url\(["']?([^"')]*?)["']?\)/gi, (match, url) => {
    if (url.startsWith('data:') || url.startsWith('#')) {
      return match;
    }

    try {
      let fullUrl: string;
      if (url.startsWith('//')) {
        fullUrl = originalUrl.protocol + url;
      } else if (url.startsWith('/')) {
        fullUrl = baseUrl + url;
      } else if (url.startsWith('http')) {
        fullUrl = url;
      } else {
        const currentPath = originalUrl.pathname.endsWith('/') ? originalUrl.pathname : originalUrl.pathname + '/';
        fullUrl = baseUrl + currentPath + url;
      }

      return `url("${fullUrl}")`;
    } catch {
      return match;
    }
  });

  // Fix meta refresh redirects
  processedContent = processedContent.replace(/content=["'](\d+);url=([^"']*?)["']/gi, (match, delay, url) => {
    try {
      let fullUrl: string;
      if (url.startsWith('//')) {
        fullUrl = originalUrl.protocol + url;
      } else if (url.startsWith('/')) {
        fullUrl = baseUrl + url;
      } else if (url.startsWith('http')) {
        fullUrl = url;
      } else {
        const currentPath = originalUrl.pathname.endsWith('/') ? originalUrl.pathname : originalUrl.pathname + '/';
        fullUrl = baseUrl + currentPath + url;
      }

      const proxyUrl = createProxyUrl(fullUrl, baseProxyUrl);
      return `content="${delay};url=${proxyUrl}"`;
    } catch {
      return match;
    }
  });

  // Add base tag for better relative URL handling
  processedContent = processedContent.replace(/<head>/i, `<head><base href="${baseUrl}/">`);

  // Inject comprehensive JavaScript to handle dynamic navigation
  const injectedScript = `
    <script>
      (function() {
        const PROXY_BASE = '${baseProxyUrl}/api/proxy-frame?u=';
        const ORIGINAL_BASE = '${baseUrl}';

        function encodeUrl(url) {
          return btoa(url).replace(/[+/=]/g, function(char) {
            switch (char) {
              case '+': return '-';
              case '/': return '_';
              case '=': return '';
              default: return char;
            }
          });
        }

        function createProxyUrl(url) {
          try {
            let fullUrl;
            if (url.startsWith('//')) {
              fullUrl = '${originalUrl.protocol}' + url;
            } else if (url.startsWith('/')) {
              fullUrl = ORIGINAL_BASE + url;
            } else if (url.startsWith('http')) {
              fullUrl = url;
            } else if (url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
              return url; // Keep as-is
            } else {
              // Relative URL
              fullUrl = new URL(url, window.location.href).href;
            }
            return PROXY_BASE + encodeUrl(fullUrl);
          } catch (e) {
            return url;
          }
        }

        // Override link clicking
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a[href]');
          if (link && link.href) {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
              e.preventDefault();
              const proxyUrl = createProxyUrl(href);
              window.location.href = proxyUrl;
            }
          }
        }, true);

        // Override form submissions
        document.addEventListener('submit', function(e) {
          const form = e.target;
          if (form.tagName === 'FORM' && form.action) {
            e.preventDefault();
            const action = form.getAttribute('action') || window.location.href;
            const proxyAction = createProxyUrl(action);

            // Create a new form with the proxy action
            const newForm = document.createElement('form');
            newForm.method = form.method || 'GET';
            newForm.action = proxyAction;
            newForm.style.display = 'none';

            // Copy all form data
            const formData = new FormData(form);
            for (const [key, value] of formData.entries()) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = value;
              newForm.appendChild(input);
            }

            document.body.appendChild(newForm);
            newForm.submit();
          }
        }, true);

        // Override window.location and history navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(state, title, url) {
          if (url && !url.startsWith('#')) {
            url = createProxyUrl(url);
          }
          return originalPushState.call(this, state, title, url);
        };

        history.replaceState = function(state, title, url) {
          if (url && !url.startsWith('#')) {
            url = createProxyUrl(url);
          }
          return originalReplaceState.call(this, state, title, url);
        };

        // Override window.open
        const originalOpen = window.open;
        window.open = function(url, target, features) {
          if (url && !url.startsWith('#') && !url.startsWith('javascript:')) {
            url = createProxyUrl(url);
          }
          return originalOpen.call(this, url, target, features);
        };

        // Monitor for dynamically added links and forms
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType === 1) { // Element node
                // Update links
                const links = node.querySelectorAll ? node.querySelectorAll('a[href]') : [];
                links.forEach(function(link) {
                  const href = link.getAttribute('href');
                  if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.includes('${baseProxyUrl}')) {
                    const proxyUrl = createProxyUrl(href);
                    link.setAttribute('href', proxyUrl);
                  }
                });

                // Update forms
                const forms = node.querySelectorAll ? node.querySelectorAll('form[action]') : [];
                forms.forEach(function(form) {
                  const action = form.getAttribute('action');
                  if (action && !action.includes('${baseProxyUrl}')) {
                    const proxyAction = createProxyUrl(action);
                    form.setAttribute('action', proxyAction);
                  }
                });
              }
            });
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        console.log('🔍 Proxy navigation interceptor loaded');
      })();
    </script>
  `;

  // Enhanced watermark with better styling
  const watermark = `
    <div id="proxy-watermark" style="position: fixed; top: 0; right: 0; background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(147, 51, 234, 0.9)); color: white; padding: 8px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; z-index: 999999; border-bottom-left-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
      🔍 Proxied Navigation Active
    </div>
    <script>
      // Hide watermark after 5 seconds for better testing
      setTimeout(() => {
        const watermark = document.getElementById('proxy-watermark');
        if (watermark) {
          watermark.style.opacity = '0.3';
          watermark.style.pointerEvents = 'none';
        }
      }, 5000);
    </script>
  `;

  // Insert the navigation script and watermark
  processedContent = processedContent.replace(/<body[^>]*>/i, (match) => match + watermark + injectedScript);

  return processedContent;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetParam = searchParams.get('url') || searchParams.get('u') || searchParams.get('q');

    if (!targetParam) {
      return new NextResponse(
        '<html><body><h1>Error: URL parameter is required</h1><p>Use ?url=&lt;target&gt; or ?u=&lt;encoded_target&gt;</p></body></html>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Decode the URL if it's encoded
    const targetUrl = decodeUrl(targetParam);

    // Basic URL validation
    let validUrl: URL;
    try {
      validUrl = new URL(targetUrl);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return new NextResponse(
        `<html><body><h1>Error: Invalid URL format</h1><p>Failed to parse: ${targetUrl}</p></body></html>`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    const isGoogle = validUrl.hostname.includes('google');
    const userAgent = getRandomUserAgent();

    // Get the base URL of this proxy for rewriting
    const baseProxyUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Enhanced headers for better compatibility, especially with Google
    const proxyHeaders: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'Referer': validUrl.origin, // Add referer for better compatibility
    };

    // Google-specific headers
    if (isGoogle) {
      proxyHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
      proxyHeaders['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
      proxyHeaders['Sec-Ch-Ua-Mobile'] = '?0';
      proxyHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
      // Remove headers that might trigger bot detection
      delete proxyHeaders['DNT'];
    }

    // Fetch the target website
    const response = await fetch(validUrl.toString(), {
      headers: proxyHeaders,
      signal: AbortSignal.timeout(20000), // 20 second timeout for slow sites
      // Add redirect handling
      redirect: 'follow',
    });

    if (!response.ok) {
      return new NextResponse(
        `<html><body><h1>Error: Failed to fetch</h1><p>Status: ${response.status} ${response.statusText}</p><p>URL: ${targetUrl}</p></body></html>`,
        {
          status: response.status,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    const content = await response.text();
    const contentType = response.headers.get('content-type') || 'text/html';

    // Educational logging
    console.log(`Iframe proxy request to: ${targetUrl}`);
    console.log(`Response status: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`User-Agent used: ${userAgent}`);

    // Process HTML content to make it work better in iframe
    let processedContent = content;

    if (contentType.includes('text/html')) {
      // Comprehensive URL rewriting
      processedContent = rewriteHtmlContent(content, validUrl, baseProxyUrl);

      // Google-specific fixes
      if (isGoogle) {
        // Remove some Google anti-iframe scripts
        processedContent = processedContent.replace(/if\s*\(\s*top\s*!=\s*self\s*\)[^}]*}/gi, '');
        processedContent = processedContent.replace(/window\.top\s*!==?\s*window\.self/gi, 'false');
        processedContent = processedContent.replace(/parent\s*!==?\s*window/gi, 'false');
      }
    }

    return new NextResponse(processedContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Enhanced iframe headers
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors 'self' *; default-src 'unsafe-inline' 'unsafe-eval' *",
        // Educational detection headers
        'X-Proxy-Source': 'educational-iframe-proxy',
        'X-Original-URL': targetUrl,
        'X-Proxy-User-Agent': userAgent,
        'X-Proxy-Navigation': 'intercepted',
        // Cache control
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Iframe proxy error:', error);
    return new NextResponse(
      `<html><body><h1>Proxy Error</h1><p>${error instanceof Error ? error.message : 'Unknown error'}</p></body></html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

export async function POST(request: NextRequest) {
  // Handle form submissions through the proxy
  try {
    const { searchParams } = new URL(request.url);
    const targetParam = searchParams.get('url') || searchParams.get('u') || searchParams.get('q');

    if (!targetParam) {
      return new NextResponse(
        '<html><body><h1>Error: URL parameter is required for POST</h1></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const targetUrl = decodeUrl(targetParam);
    const validUrl = new URL(targetUrl);
    const userAgent = getRandomUserAgent();
    const baseProxyUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Get form data
    const formData = await request.formData();

    const proxyHeaders: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Referer': validUrl.origin,
      'Origin': validUrl.origin,
    };

    // Submit the form to the target
    const response = await fetch(validUrl.toString(), {
      method: 'POST',
      headers: proxyHeaders,
      body: formData,
      signal: AbortSignal.timeout(20000),
      redirect: 'follow',
    });

    const content = await response.text();
    const contentType = response.headers.get('content-type') || 'text/html';

    let processedContent = content;
    if (contentType.includes('text/html')) {
      processedContent = rewriteHtmlContent(content, validUrl, baseProxyUrl);
    }

    return new NextResponse(processedContent, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors 'self' *; default-src 'unsafe-inline' 'unsafe-eval' *",
        'X-Proxy-Source': 'educational-iframe-proxy',
        'X-Original-URL': targetUrl,
        'X-Proxy-Method': 'POST',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('POST proxy error:', error);
    return new NextResponse(
      `<html><body><h1>POST Proxy Error</h1><p>${error instanceof Error ? error.message : 'Unknown error'}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Frame-Options': 'ALLOWALL',
    },
  });
}
