import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Progress } from './ui/Progress';
import { Loader2, Globe, Search, AlertCircle, Database, FileSearch } from 'lucide-react';

const PHASE_ICONS = {
  'init': Globe,
  'robots': FileSearch,
  'sitemap': Database,
  'crawl_start': Search,
  'crawling': Loader2,
  'detect': AlertCircle,
  'complete': Globe
};

export function AuditProgress({ progress }) {
  if (!progress || progress.length === 0) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
            </div>
            <div className="text-lg font-medium text-foreground">Initializing audit...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestEvent = progress[progress.length - 1];
  const PhaseIcon = PHASE_ICONS[latestEvent.type] || Globe;

  let progressValue = 0;
  if (latestEvent.type === 'crawling' && latestEvent.total) {
    progressValue = (latestEvent.visited / latestEvent.total) * 100;
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 shadow-lg">
        <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
          <CardTitle className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <PhaseIcon className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
            </div>
            <span className="text-xl bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent font-bold">
              Audit in Progress
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {latestEvent.type === 'crawling' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-200/50 shadow-sm">
                  <div className="text-2xl font-bold text-blue-700">{latestEvent.visited}</div>
                  <div className="text-xs text-muted-foreground mt-1">Pages Crawled</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-indigo-200/50 shadow-sm">
                  <div className="text-2xl font-bold text-indigo-700">{latestEvent.queued}</div>
                  <div className="text-xs text-muted-foreground mt-1">In Queue</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-purple-200/50 shadow-sm">
                  <div className="text-2xl font-bold text-purple-700">
                    {Math.round(progressValue)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Complete</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Crawling pages...</span>
                  <span className="font-bold text-blue-700">{latestEvent.visited} / {latestEvent.total}</span>
                </div>
                <div className="relative">
                  <Progress value={progressValue} className="h-3" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 animate-pulse pointer-events-none" />
                </div>
              </div>

              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">Currently crawling:</div>
                <div className="font-mono text-xs text-primary break-all">
                  {latestEvent.url}
                </div>
              </div>
            </>
          )}
          {latestEvent.type !== 'crawling' && (
            <div className="text-center py-4">
              <div className="text-sm font-medium text-muted-foreground">
                {latestEvent.message || latestEvent.type}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
