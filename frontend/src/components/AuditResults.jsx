import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import {
  AlertCircle,
  Link2Off,
  ExternalLink,
  Repeat,
  Shield,
  Eye,
  Unlink,
  FileText,
  Heading1,
  Lock,
  Copy,
  FileWarning,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// Severity groupings
const SEVERITY_GROUPS = {
  critical: {
    label: 'Critical',
    icon: XCircle,
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-900',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    iconColor: 'text-red-500'
  },
  warning: {
    label: 'Warnings',
    icon: AlertTriangle,
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    iconColor: 'text-amber-500'
  },
  minor: {
    label: 'Minor',
    icon: AlertCircle,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-900',
    badgeClass: 'bg-green-100 text-green-700 border-green-200',
    iconColor: 'text-green-500'
  },
  ai: {
    label: 'AI Insights',
    icon: Sparkles,
    color: 'purple',
    bgColor: 'bg-gradient-to-br from-purple-50 to-indigo-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-900',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    iconColor: 'text-purple-500'
  }
};

const ISSUE_METADATA = {
  // Critical
  BROKEN_PAGE: { icon: AlertCircle, label: 'Broken Pages', description: 'Pages returning 4xx/5xx', severity: 'critical' },
  BROKEN_INTERNAL_LINK: { icon: Link2Off, label: 'Broken Internal Links', description: 'Links to broken pages', severity: 'critical' },
  BROKEN_EXTERNAL_LINK: { icon: ExternalLink, label: 'Broken External Links', description: 'External links unreachable', severity: 'critical' },
  REDIRECT_LOOP: { icon: Repeat, label: 'Redirect Loops', description: 'Circular redirects', severity: 'critical' },
  MIXED_CONTENT: { icon: Lock, label: 'Mixed Content', description: 'HTTPS loading HTTP resources', severity: 'critical' },

  // Warnings
  REDIRECT_CHAIN: { icon: Repeat, label: 'Redirect Chains', description: 'Multiple redirects', severity: 'warning' },
  MISSING_TITLE: { icon: FileText, label: 'Missing Title', description: 'No title tag', severity: 'warning' },
  DUPLICATE_TITLE: { icon: Copy, label: 'Duplicate Titles', description: 'Same title on multiple pages', severity: 'warning' },
  MISSING_H1: { icon: Heading1, label: 'Missing H1', description: 'No H1 tag', severity: 'warning' },
  DUPLICATE_META_DESCRIPTION: { icon: Copy, label: 'Duplicate Meta', description: 'Same meta description', severity: 'warning' },

  // Minor
  MULTIPLE_H1: { icon: Heading1, label: 'Multiple H1s', description: 'More than one H1', severity: 'minor' },
  BLOCKED_BY_ROBOTS: { icon: Shield, label: 'Blocked by robots.txt', description: 'Disallowed in robots.txt', severity: 'minor' },
  NOINDEX_PAGE: { icon: Eye, label: 'Noindex Pages', description: 'Marked as noindex', severity: 'minor' },
  RESOURCE_BLOCKED_BY_ROBOTS_TXT: { icon: FileWarning, label: 'Resources Blocked', description: 'Resources blocked by robots', severity: 'minor' },
  SITEMAP_ORPHAN: { icon: Unlink, label: 'Sitemap Orphans', description: 'In sitemap, not linked', severity: 'minor' },
  ZERO_INCOMING_LINKS: { icon: Unlink, label: 'No Incoming Links', description: 'Pages with no inlinks', severity: 'minor' },
  ZERO_OUTGOING_LINKS: { icon: Unlink, label: 'No Outgoing Links', description: 'Dead-end pages', severity: 'minor' },

  // AI Issues
  LINK_INTENT_MISMATCH: { icon: Sparkles, label: 'Link Intent Mismatch', description: 'Anchor text mismatches destination', severity: 'ai', isAI: true },
  SOFT_404: { icon: Sparkles, label: 'Soft 404', description: 'HTTP 200 but content says not found', severity: 'ai', isAI: true },
  PAGE_INTENT_MISMATCH: { icon: Sparkles, label: 'Page Intent Mismatch', description: 'URL structure mismatches content', severity: 'ai', isAI: true }
};

function SeveritySection({ severityKey, severityInfo, issuesByType, onSelectIssue }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = severityInfo.icon;

  const severityIssues = Object.entries(issuesByType).filter(([type]) => {
    const metadata = ISSUE_METADATA[type];
    return metadata?.severity === severityKey;
  });

  if (severityIssues.length === 0) return null;

  const totalCount = severityIssues.reduce((sum, [, issues]) => sum + issues.length, 0);

  return (
    <Card className={`border-l-4 ${severityInfo.borderColor} overflow-hidden`}>
      <CardHeader
        className={`cursor-pointer hover:bg-slate-50 transition-colors ${severityKey === 'ai' ? severityInfo.bgColor : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${severityKey === 'critical' ? 'bg-red-100' :
                severityKey === 'warning' ? 'bg-amber-100' :
                  severityKey === 'minor' ? 'bg-green-100' :
                    'bg-purple-100'
              }`}>
              <Icon className={`w-4 h-4 ${severityInfo.iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {severityInfo.label}
                {severityKey === 'ai' && (
                  <span className="text-xs font-normal text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full">
                    AI-powered
                  </span>
                )}
              </CardTitle>
            </div>
          </div>
          <Badge className={`${severityInfo.badgeClass} border`}>{totalCount}</Badge>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          <div className="space-y-2">
            {severityIssues.map(([type, issues]) => {
              const metadata = ISSUE_METADATA[type];
              const IssueIcon = metadata.icon;

              return (
                <div
                  key={type}
                  onClick={() => onSelectIssue(type)}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all hover:shadow-sm group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <IssueIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {metadata.label}
                        {metadata.isAI && (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            <Sparkles className="w-3 h-3" />
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{metadata.description}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-3">{issues.length}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function IssueDetailPanel({ issueType, issues, onClose }) {
  const metadata = ISSUE_METADATA[issueType] || {};
  const Icon = metadata.icon || AlertCircle;

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="bg-slate-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metadata.isAI ? 'bg-purple-100' : 'bg-slate-100'
              }`}>
              <Icon className={`w-5 h-5 ${metadata.isAI ? 'text-purple-600' : 'text-slate-600'}`} />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                {metadata.label || issueType}
                {metadata.isAI && (
                  <span className="inline-flex items-center gap-1 text-sm text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    AI Insight
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {issues.length} occurrence{issues.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {issues.map((issue, idx) => (
            <IssueCard key={idx} issue={issue} issueType={issueType} isAI={metadata.isAI} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function IssueCard({ issue, issueType, isAI }) {
  const [showEvidence, setShowEvidence] = useState(false);

  // Handle duplicate issues specially
  if (issueType === 'DUPLICATE_META_DESCRIPTION' || issueType === 'DUPLICATE_TITLE') {
    return (
      <div className="p-4 border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-shadow">
        <div className="mb-3">
          <span className="text-xs font-medium text-slate-500">
            {issueType === 'DUPLICATE_TITLE' ? 'Duplicate Title:' : 'Duplicate Meta Description:'}
          </span>
          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium">
            {issue.title || issue.meta_description || 'Empty'}
          </div>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">
            Affected Pages ({issue.affected_urls?.length || 0}):
          </span>
          <div className="mt-2 space-y-1.5">
            {issue.affected_urls?.map((url, urlIdx) => (
              <div key={urlIdx} className="font-mono text-xs text-blue-600 break-all p-2 bg-blue-50 rounded border border-blue-100">
                {url}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-xl bg-white hover:shadow-sm transition-shadow ${isAI ? 'border-purple-200' : 'border-slate-200'
      }`}>
      <div className="font-mono text-sm text-blue-600 break-all mb-3 bg-slate-50 p-2 rounded-lg">
        {issue.url}
      </div>

      <div className="text-sm text-slate-700 mb-3">
        {issue.explanation}
      </div>

      {/* AI-specific info */}
      {isAI && issue.evidence?.confidence && (
        <div className="flex items-center gap-4 mb-3 text-sm">
          <span className="text-slate-500">Confidence:</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${(issue.evidence.confidence * 100)}%` }}
              />
            </div>
            <span className="font-medium text-purple-700">
              {Math.round(issue.evidence.confidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {issue.evidence && (
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium py-1">
            View Evidence →
          </summary>
          <pre className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 overflow-x-auto text-xs">
            {JSON.stringify(issue.evidence, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export function AuditResults({ result }) {
  const [selectedIssueType, setSelectedIssueType] = useState(null);

  const issuesByType = {};
  for (const issue of result.issues) {
    if (!issuesByType[issue.issue_type]) {
      issuesByType[issue.issue_type] = [];
    }
    issuesByType[issue.issue_type].push(issue);
  }

  // Count by severity
  const counts = { critical: 0, warning: 0, minor: 0, ai: 0 };
  Object.entries(issuesByType).forEach(([type, issues]) => {
    const severity = ISSUE_METADATA[type]?.severity || 'minor';
    counts[severity] += issues.length;
  });

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Audit Complete</CardTitle>
          <CardDescription className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            {result.seed_url}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="text-3xl font-bold text-blue-900">{result.crawl_stats.pages_crawled}</div>
              <div className="text-xs font-medium text-blue-700 mt-1">Pages Crawled</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
              <div className="text-3xl font-bold text-red-900">{counts.critical}</div>
              <div className="text-xs font-medium text-red-700 mt-1">Critical</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
              <div className="text-3xl font-bold text-amber-900">{counts.warning}</div>
              <div className="text-xs font-medium text-amber-700 mt-1">Warnings</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
              <div className="text-3xl font-bold text-green-900">{counts.minor}</div>
              <div className="text-xs font-medium text-green-700 mt-1">Minor</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-purple-50 to-indigo-100 rounded-xl border border-purple-200">
              <div className="text-3xl font-bold text-purple-900">{counts.ai}</div>
              <div className="text-xs font-medium text-purple-700 mt-1 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Insights
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues by Severity */}
      {result.issues.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Findings</h2>

          {Object.entries(SEVERITY_GROUPS).map(([key, info]) => (
            <SeveritySection
              key={key}
              severityKey={key}
              severityInfo={info}
              issuesByType={issuesByType}
              onSelectIssue={setSelectedIssueType}
            />
          ))}
        </div>
      ) : (
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="py-16 text-center">
            <div className="text-green-600 text-7xl mb-6">✓</div>
            <div className="text-2xl font-bold text-green-900 mb-3">No Issues Found</div>
            <div className="text-green-700 max-w-md mx-auto">
              All checks passed. Your site structure looks good.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue Detail Panel */}
      {selectedIssueType && issuesByType[selectedIssueType] && (
        <IssueDetailPanel
          issueType={selectedIssueType}
          issues={issuesByType[selectedIssueType]}
          onClose={() => setSelectedIssueType(null)}
        />
      )}
    </div>
  );
}
