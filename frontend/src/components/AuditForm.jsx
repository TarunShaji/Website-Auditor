import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Search, Sparkles, ChevronDown, ChevronUp, Info, Globe } from 'lucide-react';

export function AuditForm({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(100);
  const [enableAI, setEnableAI] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit({ url: url.trim(), maxPages, enableAI });
    }
  };

  return (
    <Card className="border-green-500/10 shadow-xl bg-gradient-to-b from-card to-background">
      <CardHeader className="pb-4 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-glow-green">
            <Globe className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold text-gradient-green">
          Scan your website
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Deep technical SEO audit with precision crawling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div>
            <label htmlFor="url" className="block text-sm font-semibold text-foreground mb-2">
              Website URL
            </label>
            <div className="relative">
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={isLoading}
                className="w-full px-4 py-3.5 text-lg bg-muted border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 disabled:opacity-50 transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* AI Toggle */}
          <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-glow-purple">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-foreground">AI Insights</div>
                <div className="text-sm text-muted-foreground">Detect intent mismatches & soft 404s</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableAI}
                onChange={(e) => setEnableAI(e.target.checked)}
                className="sr-only peer"
                disabled={isLoading}
              />
              <div className="w-14 h-7 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-foreground after:border-muted after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-purple-600"></div>
            </label>
          </div>

          {/* AI Info Tooltip */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              AI analysis runs <strong className="text-foreground">after</strong> crawling to detect link intent mismatches, soft 404s, and page intent issues. Deterministic findings are always shown first.
            </span>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced options
          </button>

          {/* Advanced Options Panel */}
          {showAdvanced && (
            <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
              <div>
                <label htmlFor="maxPages" className="block text-sm font-medium text-foreground mb-2">
                  Max Pages to Crawl
                </label>
                <input
                  id="maxPages"
                  type="number"
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value))}
                  min="1"
                  max="1000"
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:opacity-50 text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Crawler uses BFS - important pages are prioritized naturally
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-glow-green transition-all border-0"
          >
            <Search className="w-5 h-5 mr-2" />
            {isLoading ? 'Scanning...' : 'Start Scan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
