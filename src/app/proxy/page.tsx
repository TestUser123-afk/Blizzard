"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Home, Shield, AlertTriangle, CheckCircle } from "lucide-react";

export default function ProxyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentUrl, setCurrentUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [proxyMethod, setProxyMethod] = useState("bare");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proxyStatus, setProxyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    const url = searchParams.get("url");
    const method = searchParams.get("method") || "bare";

    if (url) {
      setCurrentUrl(url);
      setInputUrl(url);
      setProxyMethod(method);
      setProxyStatus("success");
    }
  }, [searchParams]);

  const handleProxyRequest = async () => {
    if (!inputUrl.trim()) {
      setError("Please enter a URL");
      return;
    }

    let fullUrl = inputUrl.trim();
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = "https://" + fullUrl;
    }

    setLoading(true);
    setError("");
    setProxyStatus("loading");

    try {
      // Update URL in browser
      const newUrl = `/proxy?url=${encodeURIComponent(fullUrl)}&method=${proxyMethod}`;
      window.history.pushState({}, "", newUrl);

      setCurrentUrl(fullUrl);
      setProxyStatus("success");
    } catch (err) {
      setError("Failed to load URL");
      setProxyStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const getProxyUrl = (url: string, method: string) => {
    switch (method) {
      case "bare":
        return `/api/bare?url=${encodeURIComponent(url)}`;
      case "wisp":
        return `/api/wisp?url=${encodeURIComponent(url)}`;
      default:
        return `/api/proxy?url=${encodeURIComponent(url)}`;
    }
  };

  const getStatusIcon = () => {
    switch (proxyStatus) {
      case "loading":
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (proxyStatus) {
      case "loading":
        return "Connecting...";
      case "success":
        return "Connected";
      case "error":
        return "Connection Failed";
      default:
        return "Ready";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-950 dark:to-cyan-950">
      {/* Header */}
      <header className="p-4 ice-card rounded-none border-b">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Button>

            <div className="flex items-center space-x-2">
              <Home className="h-5 w-5 text-blue-500" />
              <span className="font-semibold frost-text">Blizzard Proxy</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm text-muted-foreground">{getStatusText()}</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {proxyMethod.toUpperCase()}
            </Badge>
          </div>
        </div>
      </header>

      {/* URL Bar */}
      <div className="p-4">
        <Card className="ice-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg frost-text">Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter URL (e.g., https://example.com)"
                value={inputUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputUrl(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleProxyRequest()}
                className="flex-1"
              />
              <Button
                onClick={handleProxyRequest}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Go"}
              </Button>
            </div>

            {error && (
              <div className="mt-2 text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Proxy Method: {proxyMethod.toUpperCase()}</span>
              {currentUrl && (
                <span>Viewing: {new URL(currentUrl).hostname}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proxy Content */}
      <div className="flex-1 p-4">
        {currentUrl ? (
          <Card className="ice-card h-[calc(100vh-250px)]">
            <CardContent className="p-0 h-full">
              <iframe
                src={getProxyUrl(currentUrl, proxyMethod)}
                className="w-full h-full border-0 rounded-lg"
                title="Proxied Content"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock"
                onLoad={() => setProxyStatus("success")}
                onError={() => setProxyStatus("error")}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="ice-card">
            <CardContent className="text-center py-12">
              <Shield className="h-16 w-16 mx-auto mb-4 text-blue-500" />
              <h3 className="text-xl font-semibold frost-text mb-2">
                Enter a URL to Get Started
              </h3>
              <p className="text-muted-foreground">
                Use the navigation bar above to access any website through our secure proxy
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
