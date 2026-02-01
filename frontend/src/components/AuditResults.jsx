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
  ChevronRight
} from 'lucide-react';

const ISSUE_CATEGORIES = {
  errors: {
    label: 'Errors',
    subtitle: 'Critical issues that prevent pages from working correctly',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-900',
    badgeColor: 'bg-red-100 text-red-700'
  },
  redirects: {
    label: 'Redirect & Response Behavior',
    subtitle: 'Technically valid but inefficient response patterns',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-900',
    badgeColor: 'bg-orange-100 text-orange-700'
  },
  crawl_state: {
    label: 'Crawl & Indexing State',
    subtitle: 'Pages with explicit crawl or indexing restrictions',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-900',
    badgeColor: 'bg-yellow-100 text-yellow-700'
  },
  discovery: {
    label: 'Discovery & Coverage',
    subtitle: 'How pages are discovered and connected in the site graph',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  structure: {
    label: 'Page Structure & Metadata',
    subtitle: 'Page-level content and metadata hygiene',
    color: 'slate',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-900',
    badgeColor: 'bg-slate-100 text-slate-700'
  },
  security: {
    label: 'Security',
    subtitle: 'Security-related findings',
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-900',
    badgeColor: 'bg-purple-100 text-purple-700'
  }
};

const ISSUE_METADATA = {
  BROKEN_PAGE: {
    icon: AlertCircle,
    label: 'Broken Pages',
    description: 'Pages returning 4xx/5xx status codes',
    category: 'errors',
    severity: 'critical'
  },
  BROKEN_INTERNAL_LINK: {
    icon: Link2Off,
    label: 'Broken Internal Links',
    description: 'Internal links pointing to broken pages',
    category: 'errors',
    severity: 'critical'
  },
  BROKEN_EXTERNAL_LINK: {
    icon: ExternalLink,
    label: 'Broken External Links',
    description: 'External links that are unreachable',
    category: 'errors',
    severity: 'critical'
  },
  REDIRECT_LOOP: {
    icon: Repeat,
    label: 'Redirect Loops',
    description: 'Circular redirect patterns detected',
    category: 'errors',
    severity: 'critical'
  },
  REDIRECT_CHAIN: {
    icon: Repeat,
    label: 'Redirect Chains',
    description: 'Multiple redirects before reaching final destination',
    category: 'redirects',
    severity: 'warning'
  },
  BLOCKED_BY_ROBOTS: {
    icon: Shield,
    label: 'Blocked by robots.txt',
    description: 'Crawl state: disallowed by robots.txt',
    category: 'crawl_state',
    severity: 'info'
  },
  NOINDEX_PAGE: {
    icon: Eye,
    label: 'Noindex Pages',
    description: 'Indexing state: marked as noindex',
    category: 'crawl_state',
    severity: 'info'
  },
  RESOURCE_BLOCKED_BY_ROBOTS_TXT: {
    icon: FileWarning,
    label: 'Resources Blocked by robots.txt',
    description: 'Page references resources disallowed by robots.txt',
    category: 'crawl_state',
    severity: 'info'
  },
  SITEMAP_ORPHAN: {
    icon: Unlink,
    label: 'Sitemap Orphans',
    description: 'In sitemap but not reachable via internal links',
    category: 'discovery',
    severity: 'info'
  },
  ZERO_INCOMING_LINKS: {
    icon: Unlink,
    label: 'Zero Incoming Links',
    description: 'Pages with no internal links pointing to them',
    category: 'discovery',
    severity: 'info'
  },
  ZERO_OUTGOING_LINKS: {
    icon: Unlink,
    label: 'Zero Outgoing Links',
    description: 'Dead-end pages with no outgoing internal links',
    category: 'discovery',
    severity: 'info'
  },
  MISSING_TITLE: {
    icon: FileText,
    label: 'Missing Title',
    description: 'Pages without <title> tags',
    category: 'structure',
    severity: 'warning'
  },
  DUPLICATE_TITLE: {
    icon: Copy,
    label: 'Duplicate Titles',
    description: 'Multiple pages share the same title',
    category: 'structure',
    severity: 'warning'
  },
  MISSING_H1: {
    icon: Heading1,
    label: 'Missing H1',
    description: 'Pages without <h1> tags',
    category: 'structure',
    severity: 'warning'
  },
  MULTIPLE_H1: {
    icon: Heading1,
    label: 'Multiple H1s',
    description: 'Pages with more than one <h1> tag',
    category: 'structure',
    severity: 'warning'
  },
  DUPLICATE_META_DESCRIPTION: {
    icon: Copy,
    label: 'Duplicate Meta Descriptions',
    description: 'Multiple pages share the same meta description',
    category: 'structure',
    severity: 'warning'
  },
  MIXED_CONTENT: {
    icon: Lock,
    label: 'Mixed Content',
    description: 'HTTPS pages loading HTTP resources',
    category: 'security',
    severity: 'critical'
  },
  LINK_INTENT_MISMATCH: {
    icon: AlertCircle,
    label: 'Link Intent Mismatch',
    description: 'Link text does not align with destination page content',
    category: 'structure',
    severity: 'warning'
  },
};

function CategorySection({ categoryKey, categoryInfo, issuesByType, onSelectIssue }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const categoryIssues = Object.entries(issuesByType).filter(([type]) => {
    const metadata = ISSUE_METADATA[type];
    return metadata && metadata.category === categoryKey;
  });

  if (categoryIssues.length === 0) return null;

  const totalCount = categoryIssues.reduce((sum, [, issues]) => sum + issues.length, 0);

  return (
    <Card className={`border-l-4 ${categoryInfo.borderColor}`}>
      <CardHeader
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            <div>
              <CardTitle className="text-lg">{categoryInfo.label}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {categoryInfo.subtitle}
              </CardDescription>
            </div>
          </div>
          <Badge className={categoryInfo.badgeColor}>{totalCount}</Badge>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {categoryIssues.map(([type, issues]) => {
              const metadata = ISSUE_METADATA[type];
              const Icon = metadata.icon;

              return (
                <div
                  key={type}
                  onClick={() => onSelectIssue(type)}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent cursor-pointer transition-all hover:shadow-sm"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{metadata.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{metadata.description}</div>
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

export function AuditResults({ result }) {
  const [selectedIssueType, setSelectedIssueType] = useState(null);

  const issuesByType = {};
  for (const issue of result.issues) {
    if (!issuesByType[issue.issue_type]) {
      issuesByType[issue.issue_type] = [];
    }
    issuesByType[issue.issue_type].push(issue);
  }

  const errorCount = Object.entries(issuesByType).reduce((sum, [type, issues]) => {
    const metadata = ISSUE_METADATA[type];
    return sum + (metadata?.severity === 'critical' ? issues.length : 0);
  }, 0);

  const otherFindingsCount = result.crawl_stats.issues_found - errorCount;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Audit Summary</CardTitle>
          <CardDescription className="text-base">
            {result.seed_url}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="text-4xl font-bold text-blue-900">{result.crawl_stats.pages_crawled}</div>
              <div className="text-sm font-medium text-blue-700 mt-2">Pages Crawled</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
              <div className="text-4xl font-bold text-purple-900">{result.crawl_stats.sitemap_urls}</div>
              <div className="text-sm font-medium text-purple-700 mt-2">Sitemap URLs</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
              <div className="text-4xl font-bold text-red-900">{errorCount}</div>
              <div className="text-sm font-medium text-red-700 mt-2">Errors Found</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
              <div className="text-4xl font-bold text-slate-900">{otherFindingsCount}</div>
              <div className="text-sm font-medium text-slate-700 mt-2">Other Findings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {result.issues.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Findings by Category</h2>
            <span className="text-sm text-muted-foreground">
              {Object.keys(issuesByType).length} finding type{Object.keys(issuesByType).length !== 1 ? 's' : ''}
            </span>
          </div>

          {Object.entries(ISSUE_CATEGORIES).map(([key, info]) => (
            <CategorySection
              key={key}
              categoryKey={key}
              categoryInfo={info}
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
              All deterministic checks passed successfully. Your site structure looks good.
            </div>
          </CardContent>
        </Card>
      )}

      {selectedIssueType && (
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-accent/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {(() => {
                  const Icon = ISSUE_METADATA[selectedIssueType]?.icon || AlertCircle;
                  return <Icon className="w-6 h-6 text-muted-foreground" />;
                })()}
                <div>
                  <CardTitle className="text-xl">
                    {ISSUE_METADATA[selectedIssueType]?.label || selectedIssueType}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {issuesByType[selectedIssueType].length} occurrence{issuesByType[selectedIssueType].length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
              <button
                onClick={() => setSelectedIssueType(null)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {issuesByType[selectedIssueType].map((issue, idx) => {
                // Custom rendering for duplicate meta descriptions and titles
                if (selectedIssueType === 'DUPLICATE_META_DESCRIPTION') {
                  return (
                    <div key={idx} className="p-4 border border-border rounded-xl bg-card hover:shadow-sm transition-shadow">
                      <div className="mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Duplicate Meta Description:</span>
                        <div className="mt-2 p-3 bg-muted/50 rounded border border-border text-sm">
                          {issue.meta_description || 'Empty meta description'}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Affected Pages ({issue.affected_urls?.length || 0}):
                        </span>
                        <div className="mt-2 space-y-1.5">
                          {issue.affected_urls?.map((url, urlIdx) => (
                            <div key={urlIdx} className="font-mono text-xs text-primary break-all p-2 bg-muted/30 rounded border border-border/50">
                              {url}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (selectedIssueType === 'DUPLICATE_TITLE') {
                  return (
                    <div key={idx} className="p-4 border border-border rounded-xl bg-card hover:shadow-sm transition-shadow">
                      <div className="mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Duplicate Title:</span>
                        <div className="mt-2 p-3 bg-muted/50 rounded border border-border text-sm font-medium">
                          {issue.title || 'Empty title'}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Affected Pages ({issue.affected_urls?.length || 0}):
                        </span>
                        <div className="mt-2 space-y-1.5">
                          {issue.affected_urls?.map((url, urlIdx) => (
                            <div key={urlIdx} className="font-mono text-xs text-primary break-all p-2 bg-muted/30 rounded border border-border/50">
                              {url}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Default rendering for other issue types
                return (
                  <div key={idx} className="p-4 border border-border rounded-xl bg-card hover:shadow-sm transition-shadow">
                    <div className="font-mono text-sm text-primary break-all mb-3 bg-muted/50 p-2 rounded">
                      {issue.url}
                    </div>
                    <div className="text-sm text-foreground mb-3">
                      {issue.explanation}
                    </div>
                    {issue.evidence && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium py-1">
                          View Evidence →
                        </summary>
                        <pre className="mt-3 p-3 bg-muted rounded-lg border border-border overflow-x-auto text-xs">
                          {JSON.stringify(issue.evidence, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
