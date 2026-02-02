import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Progress } from './ui/Progress';
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
  Network
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
    <div className={`flex items-center gap-4 p-3 rounded-lg transition-all ${status === 'active' ? 'bg-blue-50 border border-blue-200' :
        status === 'complete' ? 'bg-green-50/50' :
          'opacity-50'
      }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === 'complete' ? 'bg-green-100 text-green-600' :
          status === 'active' ? 'bg-blue-100 text-blue-600' :
            'bg-slate-100 text-slate-400'
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
        <div className={`font-medium ${status === 'active' ? 'text-blue-900' :
            status === 'complete' ? 'text-green-800' :
              'text-slate-500'
          }`}>
          {phase.label}
          {phase.optional && <span className="text-xs ml-2 text-slate-400">(optional)</span>}
        </div>
        {detail && status === 'active' && (
          <div className="text-sm text-blue-600">{detail}</div>
        )}
      </div>
      <Icon className={`w-5 h-5 ${status === 'active' ? 'text-blue-500' :
          status === 'complete' ? 'text-green-500' :
            'text-slate-300'
        }`} />
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

  return (
    <div className="space-y-4">
      <Card className="border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 shadow-lg">
        <CardHeader className="border-b border-blue-100/50 bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
          <CardTitle className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-800">Scanning in Progress</span>
              <div className="text-sm font-normal text-slate-500">
                {latestEvent?.url ? `Currently: ${new URL(latestEvent.url).pathname}` : 'Initializing...'}
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Phase Timeline */}
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

          {/* Progress Bar for Crawling */}
          {latestEvent?.type === 'crawling' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Crawl Progress</span>
                <span className="font-bold text-blue-700">{Math.round(progressValue)}%</span>
              </div>
              <div className="relative">
                <Progress value={progressValue} className="h-2" />
              </div>
            </div>
          )}

          {/* Live Metrics */}
          {latestEvent?.type === 'crawling' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                <div className="text-2xl font-bold text-blue-700">{crawlStats.visited}</div>
                <div className="text-xs text-slate-500 mt-1">Pages Crawled</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                <div className="text-2xl font-bold text-indigo-700">{crawlStats.queued}</div>
                <div className="text-xs text-slate-500 mt-1">In Queue</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl border border-purple-100 shadow-sm">
                <div className="text-2xl font-bold text-purple-700">{crawlStats.total}</div>
                <div className="text-xs text-slate-500 mt-1">Max Pages</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
