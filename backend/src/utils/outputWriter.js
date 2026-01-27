import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class OutputWriter {
  constructor() {
    this.logger = new Logger('OUTPUT_WRITER');
    this.outputDir = path.join(__dirname, '../../outputs');
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      this.logger.info('Created outputs directory', { path: this.outputDir });
    }
  }

  createAuditDirectory(auditId) {
    const auditDir = path.join(this.outputDir, auditId);
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
      this.logger.info('Created audit directory', { auditId, path: auditDir });
    }
    return auditDir;
  }

  async writeAuditResults(auditId, result) {
    try {
      const auditDir = this.createAuditDirectory(auditId);
      
      this.logger.info('Writing audit results to files', { auditId });

      await this.writeCrawledURLs(auditDir, result.pages);
      await this.writeIssuesByType(auditDir, result.issues);
      await this.writeSummary(auditDir, result);
      await this.writeFullResult(auditDir, result);

      this.logger.success('Audit results written successfully', { 
        auditId,
        directory: auditDir 
      });

      return auditDir;
    } catch (error) {
      this.logger.error('Failed to write audit results', { 
        auditId, 
        error: error.message 
      });
      throw error;
    }
  }

  async writeCrawledURLs(auditDir, pages) {
    const filePath = path.join(auditDir, 'crawled-urls.txt');
    
    const lines = [
      '# CRAWLED URLs',
      `# Total: ${pages.length}`,
      `# Generated: ${new Date().toISOString()}`,
      '',
      '# Format: [STATUS] URL',
      ''
    ];

    for (const page of pages) {
      const status = page.http_status || 'N/A';
      lines.push(`[${status}] ${page.url}`);
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    this.logger.info('Crawled URLs written', { 
      file: 'crawled-urls.txt',
      count: pages.length 
    });
  }

  async writeIssuesByType(auditDir, issues) {
    const issuesDir = path.join(auditDir, 'issues');
    if (!fs.existsSync(issuesDir)) {
      fs.mkdirSync(issuesDir, { recursive: true });
    }

    const issuesByType = {};
    for (const issue of issues) {
      if (!issuesByType[issue.issue_type]) {
        issuesByType[issue.issue_type] = [];
      }
      issuesByType[issue.issue_type].push(issue);
    }

    for (const [issueType, issueList] of Object.entries(issuesByType)) {
      const fileName = `${issueType.toLowerCase()}.txt`;
      const filePath = path.join(issuesDir, fileName);
      
      const lines = [
        `# ${issueType}`,
        `# Count: ${issueList.length}`,
        `# Generated: ${new Date().toISOString()}`,
        '',
        '=' .repeat(80),
        ''
      ];

      for (let i = 0; i < issueList.length; i++) {
        const issue = issueList[i];
        lines.push(`## Issue ${i + 1} of ${issueList.length}`);
        lines.push('');
        
        lines.push(this.formatIssue(issue));
        lines.push('');
        lines.push('-'.repeat(80));
        lines.push('');
      }

      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    }

    this.logger.info('Issue files written', { 
      issueTypes: Object.keys(issuesByType).length,
      totalIssues: issues.length 
    });
  }

  formatIssue(issue) {
    const lines = [];
    
    lines.push(`Type: ${issue.issue_type}`);
    lines.push(`Explanation: ${issue.explanation}`);
    lines.push('');

    for (const [key, value] of Object.entries(issue)) {
      if (key === 'issue_type' || key === 'explanation') {
        continue;
      }

      if (key === 'evidence') {
        lines.push('Evidence:');
        lines.push(JSON.stringify(value, null, 2));
      } else if (Array.isArray(value)) {
        lines.push(`${this.formatKey(key)}: (${value.length} items)`);
        for (const item of value) {
          if (typeof item === 'object') {
            lines.push(`  - ${JSON.stringify(item)}`);
          } else {
            lines.push(`  - ${item}`);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`${this.formatKey(key)}:`);
        lines.push(JSON.stringify(value, null, 2));
      } else {
        lines.push(`${this.formatKey(key)}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  formatKey(key) {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async writeSummary(auditDir, result) {
    const filePath = path.join(auditDir, 'summary.txt');
    
    const lines = [
      '# AUDIT SUMMARY',
      `# Generated: ${new Date().toISOString()}`,
      '',
      '=' .repeat(80),
      '',
      `Seed URL: ${result.seed_url}`,
      `Pages Crawled: ${result.crawl_stats.pages_crawled}`,
      `Sitemap URLs: ${result.crawl_stats.sitemap_urls}`,
      `Issues Found: ${result.crawl_stats.issues_found}`,
      `Duration: ${result.crawl_stats.duration_seconds}s`,
      '',
      '=' .repeat(80),
      '',
      '## ISSUES BY TYPE',
      ''
    ];

    const sortedIssues = Object.entries(result.issue_summary)
      .sort((a, b) => b[1] - a[1]);

    for (const [issueType, count] of sortedIssues) {
      lines.push(`${issueType.padEnd(40)} ${count}`);
    }

    lines.push('');
    lines.push('=' .repeat(80));

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    this.logger.info('Summary written', { file: 'summary.txt' });
  }

  async writeFullResult(auditDir, result) {
    const filePath = path.join(auditDir, 'full-result.json');
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
    this.logger.info('Full result JSON written', { file: 'full-result.json' });
  }

  getOutputPath(auditId) {
    return path.join(this.outputDir, auditId);
  }
}
