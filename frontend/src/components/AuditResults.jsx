import React, { useState, useRef, useEffect } from 'react';
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
  XCircle,
  ArrowRight,
  Globe,
  Link as LinkIcon
} from 'lucide-react';

// Severity groupings with dark theme colors
const SEVERITY_GROUPS = {
  critical: {
    label: 'Critical',
    icon: XCircle,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    badgeVariant: 'destructive',
    iconColor: 'text-red-500'
  },
  warning: {
    label: 'Warnings',
    icon: AlertTriangle,
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    badgeVariant: 'warning',
    iconColor: 'text-amber-500'
  },
  minor: {
    label: 'Minor',
    icon: AlertCircle,
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
    badgeVariant: 'success',
    iconColor: 'text-green-500'
  },
  ai: {
    label: 'AI Insights',
    icon: Sparkles,
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    badgeVariant: 'ai',
    iconColor: 'text-purple-500'
  }
};

const ISSUE_METADATA = {
  // Critical
  BROKEN_PAGE: { icon: AlertCircle, label: 'Broken Pages', description: 'Pages returning 4xx/5xx errors', severity: 'critical' },
  BROKEN_INTERNAL_LINK: { icon: Link2Off, label: 'Broken Internal Links', description: 'Links pointing to broken pages', severity: 'critical' },
  BROKEN_EXTERNAL_LINK: { icon: ExternalLink, label: 'Broken External Links', description: 'External links unreachable', severity: 'critical' },
  REDIRECT_LOOP: { icon: Repeat, label: 'Redirect Loops', description: 'Circular redirect chains', severity: 'critical' },
  MIXED_CONTENT: { icon: Lock, label: 'Mixed Content', description: 'HTTPS pages loading HTTP resources', severity: 'critical' },

  // Warnings
  REDIRECT_CHAIN: { icon: Repeat, label: 'Redirect Chains', description: 'Multiple sequential redirects', severity: 'warning' },
  MISSING_TITLE: { icon: FileText, label: 'Missing Title', description: 'Pages without title tags', severity: 'warning' },
  DUPLICATE_TITLE: { icon: Copy, label: 'Duplicate Titles', description: 'Multiple pages sharing same title', severity: 'warning' },
  MISSING_H1: { icon: Heading1, label: 'Missing H1', description: 'Pages without H1 heading', severity: 'warning' },
  DUPLICATE_META_DESCRIPTION: { icon: Copy, label: 'Duplicate Meta', description: 'Same meta description used', severity: 'warning' },

  // Minor
  MULTIPLE_H1: { icon: Heading1, label: 'Multiple H1s', description: 'Pages with multiple H1 tags', severity: 'minor' },
  BLOCKED_BY_ROBOTS: { icon: Shield, label: 'Blocked by robots.txt', description: 'URLs disallowed in robots.txt', severity: 'minor' },
  NOINDEX_PAGE: { icon: Eye, label: 'Noindex Pages', description: 'Pages marked as noindex', severity: 'minor' },
  RESOURCE_BLOCKED_BY_ROBOTS_TXT: { icon: FileWarning, label: 'Resources Blocked', description: 'Resources blocked by robots.txt', severity: 'minor' },
  SITEMAP_ORPHAN: { icon: Unlink, label: 'Sitemap Orphans', description: 'In sitemap but not internally linked', severity: 'minor' },
  ZERO_INCOMING_LINKS: { icon: Unlink, label: 'No Incoming Links', description: 'Pages with no internal links to them', severity: 'minor' },
  ZERO_OUTGOING_LINKS: { icon: Unlink, label: 'No Outgoing Links', description: 'Dead-end pages with no links out', severity: 'minor' },

  // AI Issues
  LINK_INTENT_MISMATCH: { icon: Sparkles, label: 'Link Intent Mismatch', description: 'Anchor text mismatches destination page', severity: 'ai', isAI: true },
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
        className={`cursor-pointer hover:bg-white/5 transition-colors ${severityInfo.bgColor}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${severityInfo.bgColor}`}>
              <Icon className={`w-5 h-5 ${severityInfo.iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {severityInfo.label}
                {severityKey === 'ai' && (
                  <Badge variant="ai" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI-powered
                  </Badge>
                )}
              </CardTitle>
            </div>
          </div>
          <Badge variant={severityInfo.badgeVariant}>{totalCount}</Badge>
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
                  className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <IssueIcon className={`w-5 h-5 ${severityInfo.iconColor} opacity-60 group-hover:opacity-100`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2 text-foreground">
                        {metadata.label}
                        {metadata.isAI && (
                          <Badge variant="ai" className="text-xs px-1.5 py-0">
                            <Sparkles className="w-3 h-3" />
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{metadata.description}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="ml-3">{issues.length}</Badge>
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
  const panelRef = useRef(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [issueType]);

  return (
    <Card ref={panelRef} className={`border-2 shadow-xl ${metadata.isAI ? 'border-purple-500/30 shadow-glow-purple' : 'border-border'}`}>
      <CardHeader className="bg-card/80 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${metadata.isAI ? 'bg-purple-500/20' : 'bg-muted'}`}>
              <Icon className={`w-6 h-6 ${metadata.isAI ? 'text-purple-400' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                {metadata.label || issueType}
                {metadata.isAI && (
                  <Badge variant="ai" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Insight
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {issues.length} occurrence{issues.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg transition-colors"
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

// Specialized card for Link Intent Mismatch
function LinkIntentMismatchCard({ issue }) {
  const evidence = issue.evidence || {};
  const confidence = evidence.confidence || 0;

  return (
    <div className="p-5 border border-purple-500/30 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 transition-all">
      {/* Confidence Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-400">Link Intent Mismatch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full confidence-bar"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-purple-400">{Math.round(confidence * 100)}%</span>
        </div>
      </div>

      {/* Source URL */}
      <div className="mb-4">
        <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <Globe className="w-3 h-3" />
          Source Page
        </div>
        <div className="font-mono text-sm text-blue-400 bg-blue-500/10 px-3 py-2 rounded-lg break-all border border-blue-500/20">
          {issue.url}
        </div>
      </div>

      {/* Anchor Text with Arrow */}
      <div className="mb-4">
        <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <LinkIcon className="w-3 h-3" />
          Anchor Text
        </div>
        <div className="flex items-center gap-3">
          <div className="font-medium text-foreground bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 flex-1">
            "{evidence.anchor_text || 'Unknown'}"
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </div>

      {/* Destination */}
      <div className="mb-4">
        <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <ExternalLink className="w-3 h-3" />
          Destination Page
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border border-border/50 space-y-2">
          <div className="font-mono text-sm text-green-400 break-all">
            {evidence.destination_url || 'Unknown'}
          </div>
          {evidence.destination_title && (
            <div className="text-sm">
              <span className="text-muted-foreground">Title: </span>
              <span className="text-foreground">{evidence.destination_title}</span>
            </div>
          )}
          {evidence.destination_h1 && (
            <div className="text-sm">
              <span className="text-muted-foreground">H1: </span>
              <span className="text-foreground">{evidence.destination_h1}</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Reasoning */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          AI Reasoning
        </div>
        <div className="text-sm text-foreground bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20">
          {issue.explanation}
        </div>
      </div>
    </div>
  );
}

// Specialized card for Duplicate Title/Meta
function DuplicateCard({ issue, issueType }) {
  const evidence = issue.evidence || {};
  const isDuplicateTitle = issueType === 'DUPLICATE_TITLE';
  const duplicateValue = isDuplicateTitle
    ? (evidence.title || issue.title || evidence.duplicate_value || 'Empty')
    : (evidence.meta_description || issue.meta_description || evidence.duplicate_value || 'Empty');
  const affectedUrls = evidence.all_urls || evidence.affected_urls || evidence.pages || issue.affected_urls || [];

  return (
    <div className="p-5 border border-border/50 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all">
      {/* Duplicate Value */}
      <div className="mb-4">
        <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <Copy className="w-3 h-3" />
          {isDuplicateTitle ? 'Duplicate Title' : 'Duplicate Meta Description'}
        </div>
        <div className="font-medium text-foreground bg-amber-500/10 px-4 py-3 rounded-lg border border-amber-500/20">
          {duplicateValue || <span className="text-muted-foreground italic">Empty/Missing</span>}
        </div>
      </div>

      {/* Affected URLs */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Globe className="w-3 h-3" />
          Affected Pages ({affectedUrls.length})
        </div>
        {affectedUrls.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {affectedUrls.map((url, urlIdx) => (
              <div key={urlIdx} className="font-mono text-xs text-blue-400 bg-blue-500/10 px-3 py-2 rounded border border-blue-500/20 break-all">
                {url}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No affected URLs listed - check {issue.url || 'original page'}
          </div>
        )}
      </div>
    </div>
  );
}

// Generic issue card
function IssueCard({ issue, issueType, isAI }) {
  // Use specialized cards for specific issue types
  if (issueType === 'LINK_INTENT_MISMATCH') {
    return <LinkIntentMismatchCard issue={issue} />;
  }

  if (issueType === 'DUPLICATE_META_DESCRIPTION' || issueType === 'DUPLICATE_TITLE') {
    return <DuplicateCard issue={issue} issueType={issueType} />;
  }

  // Handle redirect chains
  if (issueType === 'REDIRECT_CHAIN') {
    const chain = issue.evidence?.chain || [];
    return (
      <div className="p-4 border border-border/50 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all">
        <div className="font-mono text-sm text-blue-400 break-all mb-3 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
          {issue.url}
        </div>
        {chain.length > 0 && (
          <div className="space-y-1 mb-3">
            <div className="text-xs font-medium text-muted-foreground">Redirect Chain:</div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {chain.map((url, i) => (
                <React.Fragment key={i}>
                  <span className="font-mono text-foreground bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                    {new URL(url).pathname || '/'}
                  </span>
                  {i < chain.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        <div className="text-sm text-muted-foreground">{issue.explanation}</div>
      </div>
    );
  }

  // Default card for other issues
  return (
    <div className={`p-4 border rounded-xl bg-muted/30 hover:bg-muted/50 transition-all ${isAI ? 'border-purple-500/20' : 'border-border/50'}`}>
      <div className="font-mono text-sm text-blue-400 break-all mb-3 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
        {issue.url}
      </div>

      {issue.explanation && (
        <div className="text-sm text-foreground mb-3">
          {issue.explanation}
        </div>
      )}

      {/* AI-specific info */}
      {isAI && issue.evidence?.confidence && (
        <div className="flex items-center gap-4 mb-3 text-sm">
          <span className="text-muted-foreground">Confidence:</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full confidence-bar"
                style={{ width: `${issue.evidence.confidence * 100}%` }}
              />
            </div>
            <span className="font-medium text-purple-400">
              {Math.round(issue.evidence.confidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {issue.evidence && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium py-1">
            View Evidence →
          </summary>
          <pre className="mt-3 p-3 bg-muted rounded-lg border border-border overflow-x-auto text-xs text-foreground">
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
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-background">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
            Audit Complete
          </CardTitle>
          <CardDescription className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {result.seed_url}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Pages Crawled */}
            <div className="text-center p-5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <div className="text-3xl font-bold text-blue-400">{result.crawl_stats.pages_crawled}</div>
              <div className="text-xs font-medium text-blue-300/80 mt-1">Pages Crawled</div>
            </div>
            {/* Critical */}
            <div className="text-center p-5 bg-red-500/10 rounded-xl border border-red-500/20">
              <div className="text-3xl font-bold text-red-400">{counts.critical}</div>
              <div className="text-xs font-medium text-red-300/80 mt-1">Critical</div>
            </div>
            {/* Warnings */}
            <div className="text-center p-5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <div className="text-3xl font-bold text-amber-400">{counts.warning}</div>
              <div className="text-xs font-medium text-amber-300/80 mt-1">Warnings</div>
            </div>
            {/* Minor */}
            <div className="text-center p-5 bg-green-500/10 rounded-xl border border-green-500/20">
              <div className="text-3xl font-bold text-green-400">{counts.minor}</div>
              <div className="text-xs font-medium text-green-300/80 mt-1">Minor</div>
            </div>
            {/* AI Insights */}
            <div className="text-center p-5 bg-purple-500/10 rounded-xl border border-purple-500/20 shadow-glow-purple">
              <div className="text-3xl font-bold text-purple-400">{counts.ai}</div>
              <div className="text-xs font-medium text-purple-300/80 mt-1 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Insights
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues by Severity */}
      {result.issues.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Findings</h2>

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
        <Card className="border-2 border-green-500/20 bg-green-500/5 shadow-glow-green">
          <CardContent className="py-16 text-center">
            <div className="text-green-500 text-7xl mb-6">✓</div>
            <div className="text-2xl font-bold text-green-400 mb-3">No Issues Found</div>
            <div className="text-green-300/80 max-w-md mx-auto">
              All checks passed. Your site structure looks healthy.
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
