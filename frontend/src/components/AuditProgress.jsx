import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Globe,
  FileSearch,
  Database,
  Search,
  AlertTriangle,
  Sparkles,
  Network,
  Link as LinkIcon,
  Clock,
  Gauge,
  Layers,
  ListOrdered,
  Zap
} from 'lucide-react';

const PHASES = [
  { id: 'robots', label: 'Robots.txt', icon: FileSearch },
  { id: 'sitemap', label: 'Sitemap', icon: Database },
  { id: 'crawling', label: 'Crawling pages', icon: Search },
  { id: 'sitemap_fetch', label: 'Sitemap-only fetch', icon: Layers },
  { id: 'detect', label: 'Detecting issues', icon: AlertTriangle },
  { id: 'ai', label: 'AI analysis', icon: Sparkles, optional: true }
];

function getPhaseStatus(phaseId, progress) {
  if (!progress || progress.length === 0) return 'pending';

  const events = progress.map(e => e.type);

  // Check if phase is completed
  if (phaseId === 'robots' && (events.includes('sitemap') || events.includes('crawl_start'))) return 'complete';
  if (phaseId === 'sitemap' && events.includes('crawl_start')) return 'complete';
  if (phaseId === 'crawling' && (events.includes('sitemap_fetch') || events.includes('detect'))) return 'complete';
  if (phaseId === 'sitemap_fetch' && events.includes('detect')) return 'complete';
  if (phaseId === 'detect' && events.includes('complete')) return 'complete';
  if (phaseId === 'ai' && events.includes('complete')) return 'complete';

  // Check if phase is active
  if (phaseId === 'robots' && events.includes('robots')) return 'active';
  if (phaseId === 'sitemap' && events.includes('sitemap')) return 'active';
  if (phaseId === 'crawling' && events.includes('crawling')) return 'active';
  if (phaseId === 'sitemap_fetch' && events.includes('sitemap_fetch')) return 'active';
  if (phaseId === 'detect' && events.includes('detect')) return 'active';

  return 'pending';
}

function PhaseItem({ phase, status, detail }) {
  const Icon = phase.icon;

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg transition-all ${status === 'active' ? 'bg-green-500/10 border border-green-500/30' :
      status === 'complete' ? 'bg-green-500/5 border border-transparent' :
        'opacity-40 border border-transparent'
      }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === 'complete' ? 'bg-green-500/20 text-green-500' :
        status === 'active' ? 'bg-green-500/20 text-green-400' :
          'bg-muted text-muted-foreground'
        }`}>
        {status === 'complete' ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : status === 'active' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1">
        <div className={`font-medium ${status === 'active' ? 'text-green-400' :
          status === 'complete' ? 'text-green-500/80' :
            'text-muted-foreground'
          }`}>
          {phase.label}
          {phase.optional && <span className="text-xs ml-2 text-muted-foreground">(optional)</span>}
        </div>
        {detail && status === 'active' && (
          <div className="text-sm text-green-400/80">{detail}</div>
        )}
      </div>
      <Icon className={`w-5 h-5 ${status === 'active' ? 'text-green-400' :
        status === 'complete' ? 'text-green-500/60' :
          'text-muted-foreground/50'
        }`} />
    </div>
  );
}

// Circular Progress Ring Component
function ProgressRing({ progress, isUnlimited }) {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = isUnlimited ? 0 : circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Background glow */}
      <div className={`absolute inset-0 rounded-full blur-xl ${isUnlimited ? 'bg-blue-500/10' : 'bg-green-500/10'}`} />

      {/* SVG Ring */}
      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="hsl(240 3.7% 15.9%)"
          strokeWidth="6"
        />
        {/* Progress circle */}
        {isUnlimited ? (
          // Animated spinning ring for unlimited mode
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#unlimitedGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
            className="animate-spin origin-center"
            style={{ animationDuration: '3s' }}
          />
        ) : (
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        )}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="unlimitedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isUnlimited ? (
          <span className="text-5xl font-bold text-blue-400">∞</span>
        ) : (
          <span className="text-5xl font-bold text-green-400">{Math.round(progress)}%</span>
        )}
      </div>
    </div>
  );
}

export function AuditProgress({ progress }) {
  const latestEvent = progress?.[progress.length - 1];

  // Calculate metrics from progress - use enhanced stats if available
  let crawlStats = {
    pagesCrawled: 0,
    urlsDiscovered: 0,
    queueRemaining: 0,
    crawlRate: 0,
    total: 100,
    isUnlimited: false
  };

  if (latestEvent?.type === 'crawling') {
    crawlStats = {
      pagesCrawled: latestEvent.pagesCrawled ?? latestEvent.visited ?? 0,
      urlsDiscovered: latestEvent.urlsDiscovered ?? (latestEvent.visited + latestEvent.queued) ?? 0,
      queueRemaining: latestEvent.queueRemaining ?? latestEvent.queued ?? 0,
      crawlRate: latestEvent.crawlRate ?? 0,
      total: latestEvent.total ?? 100,
      isUnlimited: latestEvent.isUnlimited ?? false
    };
  }

  const progressValue = crawlStats.isUnlimited
    ? 0  // Will show infinity symbol
    : (crawlStats.total > 0 ? (crawlStats.pagesCrawled / crawlStats.total) * 100 : 0);

  // Check if complete
  const isComplete = progress?.some(e => e.type === 'complete');
  const displayProgress = isComplete ? 100 : progressValue;
  const statusText = isComplete ? 'Scan Complete!' : 'Scanning...';

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className={`border-${crawlStats.isUnlimited ? 'blue' : 'green'}-500/20 bg-gradient-to-b from-card to-background overflow-hidden`}>
        <CardContent className="pt-8 pb-8">
          {/* Circular Progress */}
          <div className="mb-6">
            <ProgressRing progress={displayProgress} isUnlimited={crawlStats.isUnlimited && !isComplete} />
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            <div className={`text-xl font-semibold mb-1 ${crawlStats.isUnlimited ? 'text-blue-400' : 'text-green-400'}`}>
              {statusText}
            </div>
            {latestEvent?.url && (
              <div className="text-sm text-muted-foreground">
                {new URL(latestEvent.url).pathname}
              </div>
            )}
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {/* Pages Crawled */}
            <div className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Pages</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {crawlStats.pagesCrawled.toLocaleString()}
                {!crawlStats.isUnlimited && crawlStats.total > 0 && (
                  <span className="text-sm text-muted-foreground">/{crawlStats.total.toLocaleString()}</span>
                )}
              </div>
            </div>

            {/* URLs Discovered */}
            <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">URLs Found</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {crawlStats.urlsDiscovered.toLocaleString()}
              </div>
            </div>

            {/* Queue Remaining */}
            <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <ListOrdered className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Queue</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {crawlStats.queueRemaining.toLocaleString()}
              </div>
            </div>

            {/* Crawl Rate */}
            <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Rate</span>
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                ~{crawlStats.crawlRate}<span className="text-sm">/s</span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-black/50 rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">Activity Log</span>
            </div>
            <div className="space-y-1.5 terminal-log max-h-32 overflow-y-auto">
              {progress?.slice(-8).map((event, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span className="text-green-400">
                    Checked {event.url ? new URL(event.url).pathname : event.type}
                  </span>
                  <span className="text-muted-foreground">- OK</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-500" />
            Scan Phases
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {PHASES.map((phase) => {
              const status = getPhaseStatus(phase.id, progress);
              let detail = null;

              if (phase.id === 'crawling' && status === 'active') {
                detail = crawlStats.isUnlimited
                  ? `${crawlStats.pagesCrawled.toLocaleString()} pages (unlimited)`
                  : `${crawlStats.pagesCrawled.toLocaleString()} / ${crawlStats.total.toLocaleString()} pages`;
              }
              if (phase.id === 'sitemap' && status === 'complete') {
                const sitemapEvent = progress.find(e => e.type === 'sitemap');
                if (sitemapEvent?.count) {
                  detail = `${sitemapEvent.count} URLs`;
                }
              }

              return (
                <PhaseItem
                  key={phase.id}
                  phase={phase}
                  status={status}
                  detail={detail}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

