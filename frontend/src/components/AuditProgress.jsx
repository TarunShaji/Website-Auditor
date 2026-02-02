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
  Clock
} from 'lucide-react';

const PHASES = [
  { id: 'robots', label: 'Robots.txt', icon: FileSearch },
  { id: 'sitemap', label: 'Sitemap', icon: Database },
  { id: 'crawling', label: 'Crawling pages', icon: Search },
  { id: 'link_graph', label: 'Building link graph', icon: Network },
  { id: 'detect', label: 'Detecting issues', icon: AlertTriangle },
  { id: 'ai', label: 'AI analysis', icon: Sparkles, optional: true }
];

function getPhaseStatus(phaseId, progress) {
  if (!progress || progress.length === 0) return 'pending';

  const events = progress.map(e => e.type);

  // Check if phase is completed
  if (phaseId === 'robots' && (events.includes('sitemap') || events.includes('crawl_start'))) return 'complete';
  if (phaseId === 'sitemap' && events.includes('crawl_start')) return 'complete';
  if (phaseId === 'crawling' && events.includes('detect')) return 'complete';
  if (phaseId === 'link_graph' && events.includes('detect')) return 'complete';
  if (phaseId === 'detect' && events.includes('complete')) return 'complete';
  if (phaseId === 'ai' && events.includes('complete')) return 'complete';

  // Check if phase is active
  if (phaseId === 'robots' && events.includes('robots')) return 'active';
  if (phaseId === 'sitemap' && events.includes('sitemap')) return 'active';
  if (phaseId === 'crawling' && events.includes('crawling')) return 'active';
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
function ProgressRing({ progress }) {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Background glow */}
      <div className="absolute inset-0 rounded-full bg-green-500/10 blur-xl" />

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
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
      </svg>

      {/* Percentage text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-green-400">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

export function AuditProgress({ progress }) {
  const latestEvent = progress?.[progress.length - 1];

  // Calculate metrics from progress
  let crawlStats = { visited: 0, queued: 0, total: 100 };
  if (latestEvent?.type === 'crawling') {
    crawlStats = {
      visited: latestEvent.visited || 0,
      queued: latestEvent.queued || 0,
      total: latestEvent.total || 100
    };
  }

  const progressValue = crawlStats.total > 0
    ? (crawlStats.visited / crawlStats.total) * 100
    : 0;

  // Check if complete
  const isComplete = progress?.some(e => e.type === 'complete');
  const displayProgress = isComplete ? 100 : progressValue;
  const statusText = isComplete ? 'Scan Complete!' : 'Scanning...';

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className="border-green-500/20 bg-gradient-to-b from-card to-background overflow-hidden">
        <CardContent className="pt-8 pb-8">
          {/* Circular Progress */}
          <div className="mb-6">
            <ProgressRing progress={displayProgress} />
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            <div className="text-xl font-semibold text-green-400 mb-1">{statusText}</div>
            {latestEvent?.url && (
              <div className="text-sm text-muted-foreground">
                {new URL(latestEvent.url).pathname}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">URLs</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{crawlStats.visited}</div>
            </div>
            <div className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Pages</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {crawlStats.visited}<span className="text-sm text-muted-foreground">/{crawlStats.total}</span>
              </div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Issues</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">{latestEvent?.issues || 0}</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Time</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {latestEvent?.elapsed ? `${Math.floor(latestEvent.elapsed / 60)}:${String(latestEvent.elapsed % 60).padStart(2, '0')}` : '0:00'}
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
                detail = `${crawlStats.visited} / ${crawlStats.total} pages`;
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
