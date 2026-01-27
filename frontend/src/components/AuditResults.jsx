import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
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
  FileWarning
} from 'lucide-react';

const ISSUE_METADATA = {
  BROKEN_PAGE: { 
    icon: AlertCircle, 
    label: 'Broken Pages',
    description: 'Pages returning 4xx/5xx status codes',
    color: 'text-red-600'
  },
  BROKEN_INTERNAL_LINK: { 
    icon: Link2Off, 
    label: 'Broken Internal Links',
    description: 'Internal links pointing to broken pages',
    color: 'text-red-600'
  },
  BROKEN_EXTERNAL_LINK: { 
    icon: ExternalLink, 
    label: 'Broken External Links',
    description: 'External links that are unreachable',
    color: 'text-orange-600'
  },
  REDIRECT_CHAIN: { 
    icon: Repeat, 
    label: 'Redirect Chains',
    description: 'Pages with multiple redirects',
    color: 'text-yellow-600'
  },
  REDIRECT_LOOP: { 
    icon: Repeat, 
    label: 'Redirect Loops',
    description: 'Circular redirect patterns',
    color: 'text-red-600'
  },
  BLOCKED_BY_ROBOTS: { 
    icon: Shield, 
    label: 'Blocked by robots.txt',
    description: 'Pages blocked from crawling',
    color: 'text-blue-600'
  },
  NOINDEX_PAGE: { 
    icon: Eye, 
    label: 'Noindex Pages',
    description: 'Pages marked as noindex',
    color: 'text-blue-600'
  },
  SITEMAP_ORPHAN: { 
    icon: Unlink, 
    label: 'Sitemap Orphans',
    description: 'Pages in sitemap but not linked internally',
    color: 'text-purple-600'
  },
  ZERO_INCOMING_LINKS: { 
    icon: Unlink, 
    label: 'Zero Incoming Links',
    description: 'Pages with no internal links pointing to them',
    color: 'text-purple-600'
  },
  ZERO_OUTGOING_LINKS: { 
    icon: Unlink, 
    label: 'Zero Outgoing Links',
    description: 'Dead-end pages with no internal links',
    color: 'text-purple-600'
  },
  MISSING_TITLE: { 
    icon: FileText, 
    label: 'Missing Title',
    description: 'Pages without <title> tags',
    color: 'text-orange-600'
  },
  DUPLICATE_TITLE: { 
    icon: FileText, 
    label: 'Duplicate Titles',
    description: 'Multiple pages with the same title',
    color: 'text-yellow-600'
  },
  MISSING_H1: { 
    icon: Heading1, 
    label: 'Missing H1',
    description: 'Pages without <h1> tags',
    color: 'text-orange-600'
  },
  MULTIPLE_H1: { 
    icon: Heading1, 
    label: 'Multiple H1s',
    description: 'Pages with multiple <h1> tags',
    color: 'text-yellow-600'
  },
  MIXED_CONTENT: { 
    icon: Lock, 
    label: 'Mixed Content',
    description: 'HTTPS pages loading HTTP resources',
    color: 'text-red-600'
  },
  DUPLICATE_META_DESCRIPTION: { 
    icon: Copy, 
    label: 'Duplicate Meta Descriptions',
    description: 'Multiple pages with the same meta description',
    color: 'text-yellow-600'
  },
  RESOURCE_BLOCKED_BY_ROBOTS_TXT: { 
    icon: FileWarning, 
    label: 'Resources Blocked by robots.txt',
    description: 'Pages reference resources disallowed by robots.txt',
    color: 'text-orange-600'
  },
};

export function AuditResults({ result }) {
  const [selectedIssueType, setSelectedIssueType] = useState(null);

  const issuesByType = {};
  for (const issue of result.issues) {
    if (!issuesByType[issue.issue_type]) {
      issuesByType[issue.issue_type] = [];
    }
    issuesByType[issue.issue_type].push(issue);
  }

  const issueTypes = Object.keys(issuesByType).sort();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Summary</CardTitle>
          <CardDescription>
            Audited: {result.seed_url}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-primary">{result.crawl_stats.pages_crawled}</div>
              <div className="text-sm text-muted-foreground mt-1">Pages Crawled</div>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-primary">{result.crawl_stats.sitemap_urls}</div>
              <div className="text-sm text-muted-foreground mt-1">Sitemap URLs</div>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-destructive">{result.crawl_stats.issues_found}</div>
              <div className="text-sm text-muted-foreground mt-1">Issues Found</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {issueTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Issues by Type</CardTitle>
            <CardDescription>
              {issueTypes.length} issue type{issueTypes.length !== 1 ? 's' : ''} detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {issueTypes.map(type => {
                const metadata = ISSUE_METADATA[type] || { 
                  icon: AlertCircle, 
                  label: type, 
                  description: '',
                  color: 'text-gray-600'
                };
                const Icon = metadata.icon;
                const count = issuesByType[type].length;

                return (
                  <div
                    key={type}
                    onClick={() => setSelectedIssueType(type)}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${metadata.color}`} />
                      <div>
                        <div className="font-medium">{metadata.label}</div>
                        <div className="text-sm text-muted-foreground">{metadata.description}</div>
                      </div>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedIssueType && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{ISSUE_METADATA[selectedIssueType]?.label || selectedIssueType}</CardTitle>
                <CardDescription>
                  {issuesByType[selectedIssueType].length} issue{issuesByType[selectedIssueType].length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <button
                onClick={() => setSelectedIssueType(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {issuesByType[selectedIssueType].map((issue, idx) => (
                <div key={idx} className="p-3 border border-border rounded-lg bg-secondary/50">
                  <div className="font-mono text-sm text-primary break-all mb-2">
                    {issue.url}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {issue.explanation}
                  </div>
                  {issue.evidence && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View Evidence
                      </summary>
                      <pre className="mt-2 p-2 bg-background rounded border border-border overflow-x-auto">
                        {JSON.stringify(issue.evidence, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {issueTypes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <div className="text-xl font-semibold mb-2">No Issues Found</div>
            <div className="text-muted-foreground">
              All deterministic checks passed successfully
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
