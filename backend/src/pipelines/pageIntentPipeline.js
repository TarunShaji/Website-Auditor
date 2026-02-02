import { Logger } from '../utils/logger.js';

/**
 * Page Intent Pipeline
 * Orchestrates AI-powered page intent issue detection
 * 
 * Detects:
 * 1. SOFT_404 - Page returns 200 but content indicates "not found"
 * 2. PAGE_INTENT_MISMATCH - URL structure doesn't match page content
 * 
 * Flow:
 * 1. Build page objects from crawled pages (filter to valid HTML pages)
 * 2. Create batches of 30 pages each
 * 3. Process with 5 concurrent workers via AIService
 * 4. Create issues from AI results
 * 
 * NOTE: This pipeline runs AFTER LinkIntentPipeline (sequential, not concurrent)
 *       so logging output will be clearly separated.
 */
export class PageIntentPipeline {
    constructor(aiService, pages, outputWriter = null, auditId = null) {
        this.aiService = aiService;
        this.pages = pages;
        this.outputWriter = outputWriter;
        this.auditId = auditId;
        this.logger = new Logger('PAGE_INTENT_PIPELINE');

        // Worker configuration (larger batches than link intent - simpler analysis)
        this.workerCount = 5;
        this.batchSize = 30;

        this.logger.debug('Pipeline initialized', {
            totalPages: pages.length,
            workerCount: this.workerCount,
            batchSize: this.batchSize
        });
    }

    /**
     * Run the full pipeline
     * @returns {Array} Array of SOFT_404 and PAGE_INTENT_MISMATCH issues
     */
    async run() {
        // Initialize debug tracker
        const debugData = {
            timestamp: new Date().toISOString(),
            pipeline_config: {
                worker_count: this.workerCount,
                batch_size: this.batchSize,
                ai_provider: this.aiService.getProvider()
            },
            step1_page_objects: {
                pages_analyzed: this.pages.length,
                pages_eligible: 0,
                skipped_non_html: 0,
                skipped_error_status: 0,
                skipped_redirects: 0,
                skipped_no_metadata: 0,
                page_objects: []
            },
            step2_batching: {
                total_batches: 0,
                batch_sizes: []
            },
            step3_ai_classification: {
                total_batches: 0,
                batches: [],
                duration_seconds: 0
            },
            step4_issues: {
                soft_404_count: 0,
                page_intent_mismatch_count: 0,
                total_issues: 0,
                issues: []
            }
        };

        this.logger.info('');
        this.logger.info('╔═══════════════════════════════════════════════════════════╗');
        this.logger.info('║         PAGE INTENT PIPELINE - STARTING                   ║');
        this.logger.info('╠═══════════════════════════════════════════════════════════╣');
        this.logger.info('║  Detects: SOFT_404 + PAGE_INTENT_MISMATCH                 ║');
        this.logger.info('╚═══════════════════════════════════════════════════════════╝');
        this.logger.info('');

        if (!this.aiService.isEnabled()) {
            this.logger.warn('⚠️  AI service disabled - skipping page intent analysis');
            this.logger.info('To enable: Set GEMINI_API_KEY or ANTHROPIC_API_KEY');
            return [];
        }

        this.logger.info(`✓ AI service enabled (provider: ${this.aiService.getProvider().toUpperCase()})`);

        // ══════════════════════════════════════════════════════════
        // STEP 1: Build page objects
        // ══════════════════════════════════════════════════════════
        this.logger.info('');
        this.logger.info('┌──────────────────────────────────────────────────────────┐');
        this.logger.info('│  STEP 1/4: Building page objects from crawled pages      │');
        this.logger.info('└──────────────────────────────────────────────────────────┘');

        const pageObjects = this.buildPageObjects(debugData);

        if (pageObjects.length === 0) {
            this.logger.warn('⚠️  No eligible pages found for analysis');
            this.logger.info('  All pages were filtered out (errors, redirects, missing metadata)');
            await this.writeDebugOutput(debugData);
            return [];
        }

        this.logger.success(`✓ Built ${pageObjects.length} page objects for analysis`);

        // ══════════════════════════════════════════════════════════
        // STEP 2: Create batches
        // ══════════════════════════════════════════════════════════
        this.logger.info('');
        this.logger.info('┌──────────────────────────────────────────────────────────┐');
        this.logger.info('│  STEP 2/4: Creating batches                              │');
        this.logger.info('└──────────────────────────────────────────────────────────┘');

        const batches = this.createBatches(pageObjects, debugData);

        this.logger.success(`✓ Created ${batches.length} batches (${this.batchSize} pages/batch)`);
        this.logger.info(`  Total pages to analyze: ${pageObjects.length}`);

        // ══════════════════════════════════════════════════════════
        // STEP 3: AI Classification
        // ══════════════════════════════════════════════════════════
        this.logger.info('');
        this.logger.info('┌──────────────────────────────────────────────────────────┐');
        this.logger.info('│  STEP 3/4: Sending to AI for classification             │');
        this.logger.info('└──────────────────────────────────────────────────────────┘');
        this.logger.info(`  Provider: ${this.aiService.getProvider().toUpperCase()}`);
        this.logger.info(`  Workers: ${this.workerCount}`);
        this.logger.info(`  Batch size: ${this.batchSize}`);
        this.logger.info(`  Total batches: ${batches.length}`);
        this.logger.info(`  Estimated AI calls: ${batches.length}`);
        this.logger.info('');

        const startTime = Date.now();
        const results = await this.processWithWorkers(batches, debugData);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        debugData.step3_ai_classification.duration_seconds = parseFloat(duration);

        this.logger.success(`✓ AI classification complete in ${duration}s`);
        this.logger.info(`  Total results: ${results.length}`);
        this.logger.info(`  Soft 404s found: ${results.filter(r => r.is_soft_404).length}`);
        this.logger.info(`  Intent mismatches found: ${results.filter(r => r.is_intent_mismatch).length}`);

        // Write trace output
        if (this.outputWriter && this.auditId) {
            await this.writeTraceOutput(pageObjects, results);
        }

        // ══════════════════════════════════════════════════════════
        // STEP 4: Create issues
        // ══════════════════════════════════════════════════════════
        this.logger.info('');
        this.logger.info('┌──────────────────────────────────────────────────────────┐');
        this.logger.info('│  STEP 4/4: Creating issues from AI results              │');
        this.logger.info('└──────────────────────────────────────────────────────────┘');

        const issues = this.createIssues(results, debugData);

        // Write comprehensive debug output
        await this.writeDebugOutput(debugData);

        this.logger.info('');
        this.logger.info('╔═══════════════════════════════════════════════════════════╗');
        this.logger.success(`║  PAGE INTENT PIPELINE COMPLETE: ${issues.length} ISSUES FOUND`.padEnd(59) + '║');
        this.logger.info('╚═══════════════════════════════════════════════════════════╝');

        if (issues.length > 0) {
            this.logger.info('');
            this.logger.info('ISSUE SUMMARY:');

            const soft404s = issues.filter(i => i.issue_type === 'SOFT_404');
            const mismatches = issues.filter(i => i.issue_type === 'PAGE_INTENT_MISMATCH');

            if (soft404s.length > 0) {
                this.logger.warn(`  🔴 SOFT_404: ${soft404s.length} pages`);
                for (const issue of soft404s.slice(0, 3)) {
                    this.logger.info(`      → ${issue.url}`);
                }
                if (soft404s.length > 3) {
                    this.logger.info(`      ... and ${soft404s.length - 3} more`);
                }
            }

            if (mismatches.length > 0) {
                this.logger.warn(`  🟡 PAGE_INTENT_MISMATCH: ${mismatches.length} pages`);
                for (const issue of mismatches.slice(0, 3)) {
                    this.logger.info(`      → ${issue.url}`);
                }
                if (mismatches.length > 3) {
                    this.logger.info(`      ... and ${mismatches.length - 3} more`);
                }
            }
        }

        this.logger.info('');

        return issues;
    }

    /**
     * Build page objects from crawled pages
     * Filters to eligible pages only
     */
    buildPageObjects(debugData) {
        const objects = [];

        for (const page of this.pages) {
            // Skip non-HTML pages
            if (page.resource_type !== 'PAGE') {
                debugData.step1_page_objects.skipped_non_html++;
                this.logger.debug(`  Skip (non-HTML): ${page.url}`);
                continue;
            }

            // Skip error pages (4xx/5xx already caught by deterministic checks)
            if (page.http_status >= 400) {
                debugData.step1_page_objects.skipped_error_status++;
                this.logger.debug(`  Skip (error ${page.http_status}): ${page.url}`);
                continue;
            }

            // Skip pages with redirects (no final content to analyze)
            if (page.redirect_chain && page.redirect_chain.length > 0) {
                debugData.step1_page_objects.skipped_redirects++;
                this.logger.debug(`  Skip (redirect): ${page.url}`);
                continue;
            }

            // Skip if missing critical metadata (nothing to analyze)
            if (!page.title && (!page.h1s || page.h1s.length === 0)) {
                debugData.step1_page_objects.skipped_no_metadata++;
                this.logger.debug(`  Skip (no metadata): ${page.url}`);
                continue;
            }

            const pageObject = {
                url: page.url,
                title: page.title || '',
                h1: page.h1s?.[0] || '',
                meta_description: page.meta_description || '',
                http_status: page.http_status
            };

            objects.push(pageObject);

            // Store in debug data (limit to first 20 for file size)
            if (debugData.step1_page_objects.page_objects.length < 20) {
                debugData.step1_page_objects.page_objects.push(pageObject);
            }
        }

        debugData.step1_page_objects.pages_eligible = objects.length;

        this.logger.info(`  Pages analyzed: ${this.pages.length}`);
        this.logger.info(`  Pages eligible: ${objects.length}`);
        this.logger.info(`  Skipped (non-HTML): ${debugData.step1_page_objects.skipped_non_html}`);
        this.logger.info(`  Skipped (error status): ${debugData.step1_page_objects.skipped_error_status}`);
        this.logger.info(`  Skipped (redirects): ${debugData.step1_page_objects.skipped_redirects}`);
        this.logger.info(`  Skipped (no metadata): ${debugData.step1_page_objects.skipped_no_metadata}`);

        return objects;
    }

    /**
     * Create batches from page objects
     */
    createBatches(pageObjects, debugData) {
        const batches = [];
        for (let i = 0; i < pageObjects.length; i += this.batchSize) {
            const batch = pageObjects.slice(i, i + this.batchSize);
            batches.push(batch);
            debugData.step2_batching.batch_sizes.push(batch.length);
        }
        debugData.step2_batching.total_batches = batches.length;
        return batches;
    }

    /**
     * Process batches with worker pool
     */
    async processWithWorkers(batches, debugData) {
        debugData.step3_ai_classification.total_batches = batches.length;

        const allResults = [];
        const queue = [...batches];
        let completedBatches = 0;

        // Assign batch IDs for tracking
        const batchesWithIds = batches.map((batch, idx) => ({
            batch_id: idx + 1,
            batch_size: batch.length,
            pages: batch
        }));

        // Process with concurrent workers
        const workers = Array(Math.min(this.workerCount, queue.length))
            .fill(null)
            .map((_, i) => this.worker(queue, allResults, i, batchesWithIds, debugData, () => {
                completedBatches++;
                this.logger.info(`  ✓ Batch ${completedBatches}/${batches.length} complete`);
            }));

        await Promise.all(workers);

        return allResults;
    }

    /**
     * Worker function - processes batches from queue
     */
    async worker(queue, results, workerIndex, batchesWithIds, debugData, onComplete) {
        this.logger.debug(`  Worker ${workerIndex + 1} started`);
        let batchesProcessed = 0;

        while (queue.length > 0) {
            const batch = queue.shift();
            if (!batch) break;

            const batchId = batchesWithIds.length - queue.length;

            try {
                this.logger.debug(`  Worker ${workerIndex + 1}: Processing batch ${batchId} of ${batch.length} pages`);
                const batchStartTime = Date.now();

                // Use AIService to classify page intent
                const batchResults = await this.aiService.classifyPageIntent(batch);
                const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);

                results.push(...batchResults);
                batchesProcessed++;

                // Track batch in debug data
                debugData.step3_ai_classification.batches.push({
                    batch_id: batchId,
                    worker_id: workerIndex + 1,
                    batch_size: batch.length,
                    duration_seconds: parseFloat(batchDuration),
                    pages_sent: batch.map(p => ({
                        url: p.url,
                        title: p.title?.substring(0, 50) + (p.title?.length > 50 ? '...' : ''),
                        h1: p.h1?.substring(0, 50) + (p.h1?.length > 50 ? '...' : '')
                    })),
                    results: batchResults.map(r => ({
                        url: r.url,
                        is_soft_404: r.is_soft_404,
                        is_intent_mismatch: r.is_intent_mismatch,
                        confidence: r.confidence,
                        explanation: r.explanation?.substring(0, 100)
                    }))
                });

                onComplete();
            } catch (error) {
                this.logger.error(`  Worker ${workerIndex + 1}: Batch ${batchId} failed - ${error.message}`);

                debugData.step3_ai_classification.batches.push({
                    batch_id: batchId,
                    worker_id: workerIndex + 1,
                    batch_size: batch.length,
                    error: error.message,
                    status: 'failed'
                });
            }
        }

        this.logger.debug(`  Worker ${workerIndex + 1} finished (${batchesProcessed} batches)`);
    }

    /**
     * Create issues from AI classification results
     */
    createIssues(results, debugData) {
        const issues = [];

        for (const result of results) {
            // SOFT_404 issue (HIGH severity)
            if (result.is_soft_404) {
                const issue = {
                    issue_type: 'SOFT_404',
                    url: result.url,
                    severity: 'high',
                    explanation: result.explanation || 'Page returns HTTP 200 but content indicates it does not exist',
                    evidence: {
                        title: result.title,
                        h1: result.h1,
                        confidence: result.confidence,
                        soft_404_indicators: result.soft_404_indicators || []
                    }
                };
                issues.push(issue);
                debugData.step4_issues.soft_404_count++;
                debugData.step4_issues.issues.push(issue);
            }

            // PAGE_INTENT_MISMATCH issue (MEDIUM severity)
            if (result.is_intent_mismatch) {
                const issue = {
                    issue_type: 'PAGE_INTENT_MISMATCH',
                    url: result.url,
                    severity: 'medium',
                    explanation: result.explanation || 'URL structure does not match page content',
                    evidence: {
                        url_suggests: result.page_type_from_url,
                        content_suggests: result.page_type_from_content,
                        title: result.title,
                        h1: result.h1,
                        confidence: result.confidence
                    }
                };
                issues.push(issue);
                debugData.step4_issues.page_intent_mismatch_count++;
                debugData.step4_issues.issues.push(issue);
            }
        }

        debugData.step4_issues.total_issues = issues.length;

        this.logger.info(`  SOFT_404 issues: ${debugData.step4_issues.soft_404_count}`);
        this.logger.info(`  PAGE_INTENT_MISMATCH issues: ${debugData.step4_issues.page_intent_mismatch_count}`);
        this.logger.info(`  Total issues: ${issues.length}`);

        return issues;
    }

    /**
     * Write trace output (page objects sent to AI)
     */
    async writeTraceOutput(pageObjects, results) {
        try {
            const auditDir = this.outputWriter.getOutputPath(this.auditId);

            this.logger.info('  Writing trace files...');

            // Write page intent objects (AI input)
            await this.outputWriter.writeJSON(auditDir, 'page-intent-objects.json', {
                generated: new Date().toISOString(),
                description: 'Page objects sent to AI for SOFT_404 and PAGE_INTENT_MISMATCH detection',
                total: pageObjects.length,
                objects: pageObjects
            });
            this.logger.info('  ✓ page-intent-objects.json');

            // Write AI results
            await this.outputWriter.writeJSON(auditDir, 'page-intent-results.json', {
                generated: new Date().toISOString(),
                total: results.length,
                soft_404_count: results.filter(r => r.is_soft_404).length,
                intent_mismatch_count: results.filter(r => r.is_intent_mismatch).length,
                results: results
            });
            this.logger.info('  ✓ page-intent-results.json');

            this.logger.success('  Trace output written successfully');
        } catch (error) {
            this.logger.error('Failed to write trace output', { error: error.message });
        }
    }

    /**
     * Write comprehensive debug output showing entire pipeline flow
     */
    async writeDebugOutput(debugData) {
        if (!this.outputWriter || !this.auditId) {
            this.logger.debug('No output writer configured - skipping debug output');
            return;
        }

        try {
            const auditDir = this.outputWriter.getOutputPath(this.auditId);

            await this.outputWriter.writeJSON(auditDir, 'page-intent-debug.json', debugData);

            this.logger.info('  ✓ page-intent-debug.json written');
        } catch (error) {
            this.logger.error('Failed to write pipeline debug output', { error: error.message });
        }
    }
}
