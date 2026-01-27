import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Search } from 'lucide-react';

export function AuditForm({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(100);
  const [maxDepth, setMaxDepth] = useState(5);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit({ url: url.trim(), maxPages, maxDepth });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Website Audit</CardTitle>
        <CardDescription>
          Enter a website URL to perform a deterministic technical audit
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-foreground mb-2">
              Website URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxPages" className="block text-sm font-medium text-foreground mb-2">
                Max Pages
              </label>
              <input
                id="maxPages"
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value))}
                min="1"
                max="1000"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="maxDepth" className="block text-sm font-medium text-foreground mb-2">
                Max Depth
              </label>
              <input
                id="maxDepth"
                type="number"
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                min="1"
                max="10"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            <Search className="w-4 h-4 mr-2" />
            {isLoading ? 'Auditing...' : 'Start Audit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
