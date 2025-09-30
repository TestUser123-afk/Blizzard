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

      // Don't rewrite Google search forms - let JavaScript handle them completely
      if (fullUrl.includes('google.com') && (fullUrl.includes('/search') || url.includes('/search'))) {
        return match; // Keep original action, JavaScript will intercept
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

  // Inject comprehensive JavaScript to handle dynamic navigation
  const injectedScript = `
    <script>
      // IMMEDIATE form blocking - don't wait for anything
      (function() {
        console.log('🚀 IMMEDIATE proxy interceptor loading...');

        // Block ALL form submissions immediately
        document.addEventListener('submit', function(e) {
          console.log('⚡ IMMEDIATE form block triggered');
          if (e.target.tagName === 'FORM') {
            const form = e.target;
            const searchInput = form.querySelector('input[name="q"]');
            if (searchInput || window.location.href.includes('google.com')) {
              console.log('🛑 IMMEDIATE Google form block');
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              return false;
            }
          }
        }, true);
      })();

      (function() {
        const PROXY_BASE = '${baseProxyUrl}/api/proxy-frame?u=';
        const ORIGINAL_BASE = '${baseUrl}';

        console.log('🔧 Proxy navigation script loaded');
        console.log('📍 Proxy base:', PROXY_BASE);
        console.log('🌐 Original base:', ORIGINAL_BASE);

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

        // AGGRESSIVE form submission override - must prevent ALL Google form submissions
        function interceptFormSubmission(e) {
          const form = e.target;

          console.log('🚨 FORM SUBMISSION DETECTED:', {
            tag: form.tagName,
            action: form.action,
            method: form.method,
            hasSearchInput: !!form.querySelector('input[name="q"]'),
            currentUrl: window.location.href,
            eventType: e.type
          });

          if (form.tagName === 'FORM') {
            // Check if this is ANY kind of Google search form
            const searchInput = form.querySelector('input[name="q"]');
            const isGoogleSearch = searchInput ||
                                 form.action.includes('/search') ||
                                 form.action.includes('google.com') ||
                                 window.location.href.includes('google.com');

            if (isGoogleSearch) {
              console.log('🛑 BLOCKING Google form submission');
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();

              const searchQuery = searchInput ? (searchInput.value || '') : '';
              if (searchQuery.trim()) {
                console.log('🔍 Redirecting search for:', searchQuery);
                const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(searchQuery.trim());
                const proxyUrl = PROXY_BASE + encodeUrl(searchUrl);
                console.log('🔄 Going to:', proxyUrl);

                // Force redirect
                setTimeout(() => {
                  window.location.href = proxyUrl;
                }, 50);
              }
              return false;
            }

            // Handle other forms normally
            e.preventDefault();
            const formData = new FormData(form);
            const action = form.getAttribute('action') || window.location.href;
            const method = form.method || 'GET';

            if (method.toUpperCase() === 'GET') {
              let targetUrl;
              try {
                targetUrl = new URL(action, window.location.href);
                for (const [key, value] of formData.entries()) {
                  targetUrl.searchParams.set(key, value);
                }
                const proxyUrl = createProxyUrl(targetUrl.toString());
                window.location.href = proxyUrl;
              } catch (e) {
                const proxyUrl = createProxyUrl(action);
                window.location.href = proxyUrl;
              }
            } else {
              // POST forms
              const proxyAction = createProxyUrl(action);
              const newForm = document.createElement('form');
              newForm.method = method;
              newForm.action = proxyAction;
              newForm.style.display = 'none';

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
          }
        }

        // Add multiple event listeners to catch ALL form submissions
        document.addEventListener('submit', interceptFormSubmission, true); // Capture phase
        document.addEventListener('submit', interceptFormSubmission, false); // Bubble phase

        // Also intercept on document ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            document.addEventListener('submit', interceptFormSubmission, true);
            console.log('📋 Added DOMContentLoaded form interceptor');
          });
        }

        // Override link clicking
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a[href]');
          if (link && link.href) {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
              e.preventDefault();

              // Handle Google search result links specially
              if (href.includes('/url?') && href.includes('&url=')) {
                // Extract the actual URL from Google's redirect
                try {
                  const urlMatch = href.match(/[&?]url=([^&]*)/);
                  if (urlMatch) {
                    const actualUrl = decodeURIComponent(urlMatch[1]);
                    const proxyUrl = createProxyUrl(actualUrl);
                    window.location.href = proxyUrl;
                    return;
                  }
                } catch (e) {
                  console.log('Failed to extract Google redirect URL:', e);
                }
              }

              // Handle regular links
              const proxyUrl = createProxyUrl(href);
              window.location.href = proxyUrl;
            }
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
                  if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.includes('/api/proxy-frame')) {
                    const proxyUrl = createProxyUrl(href);
                    link.setAttribute('href', proxyUrl);
                  }
                });

                // Update forms
                const forms = node.querySelectorAll ? node.querySelectorAll('form[action]') : [];
                forms.forEach(function(form) {
                  const action = form.getAttribute('action');
                  if (action && !action.includes('/api/proxy-frame')) {
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

  // Insert the navigation script IMMEDIATELY after head tag for fastest loading
  processedContent = processedContent.replace(/<head[^>]*>/i, (match) => match + injectedScript);

  // Insert watermark in body
  processedContent = processedContent.replace(/<body[^>]*>/i, (match) => match + watermark);

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

    // Check if this is a Google search form submission (has 'q' parameter and other Google params)
    const searchQuery = searchParams.get('q');
    if (searchQuery && (searchParams.has('sca_esv') || searchParams.has('source') || searchParams.has('ei'))) {
      // This is a Google search form submission, reconstruct the proper Google search URL
      console.log(`🔍 Detected Google search form submission: "${searchQuery}"`);
      console.log(`📋 Search params:`, Array.from(searchParams.entries()));

      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

      // Redirect to the proper Google search through our proxy
      const encodedGoogleUrl = encodeUrl(googleSearchUrl);
      const redirectUrl = `/api/proxy-frame?u=${encodedGoogleUrl}`;

      console.log(`🔄 Redirecting to: ${googleSearchUrl}`);

      return new NextResponse(
        `<html><body>
          <script>window.location.href = '${redirectUrl}';</script>
          <p>Redirecting to Google search for: ${searchQuery}</p>
          <p>If not redirected, <a href="${redirectUrl}">click here</a></p>
        </body></html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Decode the URL if it's encoded
    let targetUrl = decodeUrl(targetParam);

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
          return new NextResponse(
            `<html><body><h1>Error: Invalid URL format</h1><p>Failed to parse: ${targetParam}</p><p>Attempted Google search for: ${targetUrl}</p></body></html>`,
            {
              status: 400,
              headers: { 'Content-Type': 'text/html' }
            }
          );
        }
      } else {
        return new NextResponse(
          `<html><body><h1>Error: Invalid URL format</h1><p>Failed to parse: ${targetUrl}</p></body></html>`,
          {
            status: 400,
            headers: { 'Content-Type': 'text/html' }
          }
        );
      }
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
      // Provide more detailed error information
      const statusText = response.statusText || 'Unknown Error';
      const errorBody = await response.text().catch(() => 'No error details available');

      return new NextResponse(
        `<html><body>
          <h1>Proxy Error: Failed to fetch</h1>
          <p><strong>Status:</strong> ${response.status} ${statusText}</p>
          <p><strong>URL:</strong> ${targetUrl}</p>
          <p><strong>Original Query:</strong> ${targetParam}</p>
          ${errorBody ? `<p><strong>Server Response:</strong></p><pre>${errorBody.substring(0, 500)}</pre>` : ''}
          <hr>
          <p><small>This might be due to:</small></p>
          <ul>
            <li>The target website blocking proxy requests</li>
            <li>Network connectivity issues</li>
            <li>The website requiring special authentication</li>
            <li>CORS or security restrictions</li>
          </ul>
          <p><a href="javascript:history.back()">← Go Back</a></p>
        </body></html>`,
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
      processedContent = rewriteHtmlContent(content, validUrl, baseProxyUrl);
    }

    // Google-specific fixes
    if (isGoogle) {
      // Remove some Google anti-iframe scripts
      processedContent = processedContent.replace(/if\s*\(\s*top\s*!=\s*self\s*\)[^}]*}/gi, '');
      processedContent = processedContent.replace(/window\.top\s*!==?\s*window\.self/gi, 'false');
      processedContent = processedContent.replace(/parent\s*!==?\s*window/gi, 'false');
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

    // Check if this is a Google search form submission via POST
    const searchQuery = searchParams.get('q');
    if (searchQuery && (searchParams.has('sca_esv') || searchParams.has('source') || searchParams.has('ei'))) {
      // This is a Google search form submission, reconstruct the proper Google search URL
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

      // Redirect to the proper Google search through our proxy
      const encodedGoogleUrl = encodeUrl(googleSearchUrl);
      const redirectUrl = `/api/proxy-frame?u=${encodedGoogleUrl}`;

      return new NextResponse(
        `<html><body>
          <script>window.location.href = '${redirectUrl}';</script>
          <p>Redirecting to Google search for: ${searchQuery}</p>
          <p>If not redirected, <a href="${redirectUrl}">click here</a></p>
        </body></html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

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
