import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Search, Sparkles, ChevronDown, ChevronUp, Info } from 'lucide-react';

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
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
      <CardHeader className="pb-4">
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
          Scan your website
        </CardTitle>
        <CardDescription className="text-base text-slate-600">
          Deep technical SEO audit with precision crawling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div>
            <label htmlFor="url" className="block text-sm font-semibold text-slate-700 mb-2">
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
                className="w-full px-4 py-3.5 text-lg border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 transition-all bg-white"
              />
            </div>
          </div>

          {/* AI Toggle */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-slate-800">AI Insights</div>
                <div className="text-sm text-slate-500">Detect intent mismatches & soft 404s</div>
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
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600"></div>
            </label>
          </div>

          {/* AI Info Tooltip */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              AI analysis runs <strong>after</strong> crawling to detect link intent mismatches, soft 404s, and page intent issues. Deterministic findings are always shown first.
            </span>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced options
          </button>

          {/* Advanced Options Panel */}
          {showAdvanced && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div>
                <label htmlFor="maxPages" className="block text-sm font-medium text-slate-700 mb-2">
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 bg-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Crawler uses BFS - important pages are prioritized naturally
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
          >
            <Search className="w-5 h-5 mr-2" />
            {isLoading ? 'Scanning...' : 'Start Scan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
