"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, Settings, Play, Globe, Shield, Snowflake, Zap } from "lucide-react";

const gameCategories = [
  "Action", "Adventure", "Puzzle", "Racing", "Sports", "Strategy", "Arcade", "Simulation"
];

const mockGames = [
  { name: "Slope", category: "Arcade", description: "Roll down the slope without falling off!", image: "🎮" },
  { name: "Among Us", category: "Action", description: "Find the impostor among the crew", image: "🚀" },
  { name: "2048", category: "Puzzle", description: "Combine tiles to reach 2048", image: "🧩" },
  { name: "Subway Surfers", category: "Action", description: "Run and dodge obstacles", image: "🏃" },
  { name: "Flappy Bird", category: "Arcade", description: "Navigate through pipes", image: "🐦" },
  { name: "Snake", category: "Arcade", description: "Classic snake game", image: "🐍" },
  { name: "Tetris", category: "Puzzle", description: "Clear lines by completing them", image: "⬜" },
  { name: "Chrome Dino", category: "Arcade", description: "Jump over cacti in the desert", image: "🦕" },
];

const proxyMethods = [
  { name: "Bare Server", status: "Online", description: "Fast and reliable proxy method" },
  { name: "WISP Protocol", status: "Online", description: "WebSocket-based proxy for better performance" },
  { name: "Ultraviolet", status: "Online", description: "Advanced web proxy with stealth features" },
];

function SnowEffect() {
  const [snowflakes, setSnowflakes] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    const flakes = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake absolute"
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`,
            top: "-10px"
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [selectedProxy, setSelectedProxy] = useState("bare");

  const filteredGames = mockGames.filter(game => {
    const matchesCategory = selectedCategory === "All" || game.category === selectedCategory;
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleProxyNavigation = () => {
    if (!proxyUrl.trim()) return;

    let fullUrl = proxyUrl.trim();
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = "https://" + fullUrl;
    }

    router.push(`/proxy?url=${encodeURIComponent(fullUrl)}&method=${selectedProxy}`);
  };

  const handleGameClick = (gameName: string) => {
    // Mock game URLs - in a real implementation, these would be actual game URLs
    const gameUrls: Record<string, string> = {
      "Slope": "https://slope-game.github.io/",
      "Among Us": "https://among-us.io/",
      "2048": "https://play2048.co/",
      "Subway Surfers": "https://poki.com/en/g/subway-surfers",
      "Flappy Bird": "https://flappybird.io/",
      "Snake": "https://playsnake.org/",
      "Tetris": "https://tetris.com/play-tetris",
      "Chrome Dino": "https://chromedino.com/"
    };

    const gameUrl = gameUrls[gameName] || `https://www.google.com/search?q=${encodeURIComponent(gameName + " game")}`;
    router.push(`/proxy?url=${encodeURIComponent(gameUrl)}&method=${selectedProxy}`);
  };

  return (
    <div className="min-h-screen relative">
      <SnowEffect />

      {/* Header */}
      <header className="relative z-10 p-6 ice-card rounded-none">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Snowflake className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold frost-text">Blizzard</h1>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Shield className="h-3 w-3 mr-1" />
              Secure Proxy
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Select value={selectedProxy} onValueChange={setSelectedProxy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bare">Bare Server</SelectItem>
                  <SelectItem value="wisp">WISP Protocol</SelectItem>
                  <SelectItem value="ultraviolet">Ultraviolet</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {proxyMethods.map((method, i) => (
                <div key={i} className="flex items-center space-x-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-muted-foreground">{method.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Proxy URL Input */}
      <section className="relative z-10 p-6">
        <div className="container mx-auto">
          <Card className="ice-card">
            <CardHeader className="text-center">
              <CardTitle className="frost-text text-2xl">Navigate the Web Freely</CardTitle>
              <CardDescription>
                Enter any URL to access it through our secure proxy network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter URL (e.g., https://example.com)"
                    className="pl-10"
                    value={proxyUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProxyUrl(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleProxyNavigation()}
                  />
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleProxyNavigation}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Go
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                Using {selectedProxy === "bare" ? "Bare Server" : selectedProxy === "wisp" ? "WISP Protocol" : "Ultraviolet"} proxy method
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="relative z-10 p-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search games..."
                className="pl-10 ice-card"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "All" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("All")}
                className={selectedCategory === "All" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                All
              </Button>
              {gameCategories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="relative z-10 p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredGames.map((game, index) => (
              <Card key={index} className="game-card cursor-pointer" onClick={() => handleGameClick(game.name)}>
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">{game.image}</div>
                  <CardTitle className="text-lg">{game.name}</CardTitle>
                  <Badge variant="secondary" className="w-fit mx-auto">
                    {game.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center mb-4">
                    {game.description}
                  </CardDescription>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      handleGameClick(game.name);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Play Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 p-6 mt-12">
        <div className="container mx-auto">
          <Separator className="mb-6" />
          <div className="text-center text-muted-foreground">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Snowflake className="h-4 w-4" />
              <span className="font-semibold">Blizzard Proxy</span>
              <Snowflake className="h-4 w-4" />
            </div>
            <p className="text-sm">
              Educational proxy testing tool - Use responsibly and follow your organization's policies
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
