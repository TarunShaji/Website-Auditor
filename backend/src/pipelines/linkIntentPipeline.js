import { Logger } from '../utils/logger.js';

/**
 * Link Intent Pipeline
 * Orchestrates AI-powered link intent mismatch detection
 * 
 * Flow:
 * 1. Collect all content_internal_links from pages
 * 2. Build complete intent objects (add destination metadata)
 * 3. Deduplicate by link_key
 * 4. Batch and send to AI (5 workers × 5 objects/batch)
 * 5. Return mismatch issues
 */
export class LinkIntentPipeline {
    constructor(aiService, pages, outputWriter = null, auditId = null) {
        this.aiService = aiService;
        this.pages = pages;
        this.outputWriter = outputWriter;
        this.auditId = auditId;
        this.logger = new Logger('INTENT_PIPELINE');

        // Worker configuration
        this.workerCount = 5;
        this.batchSize = 5;

        // Build pages map for destination lookup
        this.pagesMap = new Map(pages.map(p => [p.url, p]));

        this.logger.debug('Pipeline initialized', {
            totalPages: pages.length,
            pagesWithMetadata: Array.from(this.pagesMap.values()).filter(p => p.title || p.h1s?.length).length,
            workerCount: this.workerCount,
            batchSize: this.batchSize
        });
    }

    /**
     * Run the full pipeline
     * @returns {Array} Array of LINK_INTENT_MISMATCH issues
     */
    async run() {
        // Initialize debug tracker
        const debugData = {
            timestamp: new Date().toISOString(),
            pipeline_config: {
                worker_count: this.workerCount,
                batch_size: this.batchSize
            },
            step1_content_links: {
                pages_analyzed: this.pages.length,
                pages_with_content_links: 0,
                total_links_extracted: 0,
                links_by_page: []
            },
            step2_intent_objects: {
                objects_built: 0,
                skipped_not_crawled: 0,
                skipped_no_metadata: 0,
                sample_objects: []
            },
            step3_deduplication: {
                before: 0,
                after: 0,
                duplicates_removed: 0
            },
            step4_ai_classification: {
                total_batches: 0,
                batches: [],
                duration_seconds: 0
            },
            step5_issues: {
                total_issues: 0,
                mismatches: [],
                aligned: []
            }
        };

        this.logger.info('═══════════════════════════════════════════════════════════');
        this.logger.info('            LINK INTENT PIPELINE - STARTING                 ');
        this.logger.info('═══════════════════════════════════════════════════════════');

        if (!this.aiService.isEnabled()) {
            this.logger.warn('⚠️  AI service disabled - skipping intent analysis');
            this.logger.info('To enable: Set ANTHROPIC_API_KEY and ENABLE_AI_ANALYSIS=true');
            return [];
        }

        this.logger.info('✓ AI service is enabled');

        // ══════════════════════════════════════════════════════════
        // STEP 1: Collect content links
        // ══════════════════════════════════════════════════════════
        this.logger.info('');
        this.logger.info('STEP 1/5: Collecting content links from all pages...');
        const allContentLinks = this.collectContentLinks(debugData);

        if (allContentLinks.length === 0) {
            this.logger.warn('⚠️  No content links found across all pages');
            this.logger.info('This could mean:');
            this.logger.info('  - No <main>/<article> elements on pages');
            this.logger.info('  - All links are in nav/header/footer');
            this.logger.info('  - Pages have no internal links');
            await this.writeDebugOutput(debugData);
            return [];
        }

        this.logger.success(`✓ Collected ${allContentLinks.length} content links`);

        // ══════════════════════════════════════════════════════════
        // STEP 2: Build intent objects
        // ══════════════════════════════════════════════════════════
        this.logger.info('');
        this.logger.info('STEP 2/5: Building intent objects (adding destination metadata)...');
        const intentObjects = this.buildIntentObjects(allContentLinks, debugData);

        if (intentObjects.length === 0) {
            this.logger.warn('⚠️  No intent objects could be built');
            this.logger.info('This means destination pages are missing title/h1 metadata');
            await this.writeDebugOutput(debugData);
            return [];
        }

        this.logger.success(`✓ Built ${intentObjects.length} intent objects`);
        this.logger.debug('Sample intent object:', JSON.stringify(intentObjects[0], null, 2));

        // ══════════════════════════════════════════════════════════
        // STEP 3: Deduplicate
        // ══════════════════════════════════════════════════════════
        this.logger.info('');
        this.logger.info('STEP 3/5: Deduplicating intent objects by link_key...');
        const uniqueIntents = this.deduplicateIntents(intentObjects, debugData);

        const duplicatesRemoved = intentObjects.length - uniqueIntents.length;
        this.logger.success(`✓ Deduplicated: ${intentObjects.length} → ${uniqueIntents.length} (removed ${duplicatesRemoved} duplicates)`);

        // ══════════════════════════════════════════════════════════
        // STEP 4: AI Classification
        // ══════════════════════════════════════════════════════════
        this.logger.info('');
        this.logger.info('STEP 4/5: Sending to AI for classification...');
        this.logger.info(`  Workers: ${this.workerCount}`);
        this.logger.info(`  Batch size: ${this.batchSize}`);
        this.logger.info(`  Total batches: ${Math.ceil(uniqueIntents.length / this.batchSize)}`);
        this.logger.info(`  Estimated AI calls: ${Math.ceil(uniqueIntents.length / this.batchSize)}`);

        const startTime = Date.now();
        const results = await this.processWithWorkers(uniqueIntents, debugData);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        debugData.step4_ai_classification.duration_seconds = parseFloat(duration);

        this.logger.success(`✓ AI classification complete in ${duration}s`);
        this.logger.info(`  Total results: ${results.length}`);
        this.logger.info(`  Mismatches found: ${results.filter(r => r.is_mismatch).length}`);
        this.logger.info(`  Aligned links: ${results.filter(r => !r.is_mismatch).length}`);

        // Write trace output if available
        if (this.outputWriter && this.auditId) {
            await this.writeTraceOutput(uniqueIntents, results);
        }

        // ══════════════════════════════════════════════════════════
        // STEP 5: Create issues
        // ══════════════════════════════════════════════════════════
        this.logger.info('');
        this.logger.info('STEP 5/5: Creating issues from mismatches...');
        const issues = this.createIssues(results, debugData);

        debugData.step5_issues.total_issues = issues.length;

        // Write comprehensive debug output
        await this.writeDebugOutput(debugData);

        this.logger.info('');
        this.logger.info('═══════════════════════════════════════════════════════════');
        this.logger.success(`        PIPELINE COMPLETE: ${issues.length} ISSUES FOUND`);
        this.logger.info('═══════════════════════════════════════════════════════════');

        if (issues.length > 0) {
            this.logger.info('');
            this.logger.info('MISMATCH SUMMARY:');
            for (const issue of issues.slice(0, 5)) {
                this.logger.warn(`  ⚠️  "${issue.evidence.anchor_text}" → ${issue.evidence.destination_url}`);
                this.logger.info(`      Confidence: ${(issue.evidence.confidence * 100).toFixed(0)}%`);
            }
            if (issues.length > 5) {
                this.logger.info(`  ... and ${issues.length - 5} more`);
            }
        }

        return issues;
    }

    /**
     * Collect all content_internal_links from all pages
     */
    collectContentLinks(debugData) {
        const allLinks = [];
        let pagesWithContentLinks = 0;

        for (const page of this.pages) {
            if (page.content_internal_links && page.content_internal_links.length > 0) {
                pagesWithContentLinks++;
                allLinks.push(...page.content_internal_links);
                this.logger.debug(`  Page ${page.url}: ${page.content_internal_links.length} content links`);

                // Track in debug data
                debugData.step1_content_links.links_by_page.push({
                    page_url: page.url,
                    links_count: page.content_internal_links.length,
                    links: page.content_internal_links.map(l => ({
                        destination_url: l.destination_url,
                        anchor_text: l.anchor_text,
                        context_type: l.context_type
                    }))
                });
            }
        }

        debugData.step1_content_links.pages_with_content_links = pagesWithContentLinks;
        debugData.step1_content_links.total_links_extracted = allLinks.length;

        this.logger.info(`  Pages with content links: ${pagesWithContentLinks}/${this.pages.length}`);
        return allLinks;
    }

    /**
     * Build complete intent objects with destination metadata
     */
    buildIntentObjects(contentLinks, debugData) {
        const intentObjects = [];
        let skippedNotCrawled = 0;
        let skippedNoMetadata = 0;

        for (const link of contentLinks) {
            // Look up destination page
            const destPage = this.pagesMap.get(link.destination_url);

            // Skip if destination not crawled
            if (!destPage) {
                skippedNotCrawled++;
                this.logger.debug(`  Skipped (not crawled): ${link.destination_url}`);
                continue;
            }

            // Skip if destination has no meaningful metadata
            if (!destPage.title && (!destPage.h1s || destPage.h1s.length === 0)) {
                skippedNoMetadata++;
                this.logger.debug(`  Skipped (no metadata): ${link.destination_url}`);
                continue;
            }

            intentObjects.push({
                source_url: link.source_url,
                anchor_text: link.anchor_text,
                context_type: link.context_type,
                destination_url: link.destination_url,
                destination_title: destPage.title,
                destination_h1: destPage.h1s?.[0] || null,
                destination_meta: destPage.meta_description,
                link_key: `${link.destination_url}|${link.anchor_text}`
            });
        }

        this.logger.info(`  Successfully built: ${intentObjects.length}`);
        this.logger.info(`  Skipped (not crawled): ${skippedNotCrawled}`);
        this.logger.info(`  Skipped (no metadata): ${skippedNoMetadata}`);

        // Track in debug data
        debugData.step2_intent_objects.objects_built = intentObjects.length;
        debugData.step2_intent_objects.skipped_not_crawled = skippedNotCrawled;
        debugData.step2_intent_objects.skipped_no_metadata = skippedNoMetadata;
        debugData.step2_intent_objects.sample_objects = intentObjects.slice(0, 3);

        return intentObjects;
    }

    /**
     * Deduplicate intent objects by link_key
     */
    deduplicateIntents(intents, debugData) {
        const seen = new Map();

        for (const intent of intents) {
            if (!seen.has(intent.link_key)) {
                seen.set(intent.link_key, intent);
            }
        }

        const uniqueIntents = Array.from(seen.values());

        // Track in debug data
        debugData.step3_deduplication.before = intents.length;
        debugData.step3_deduplication.after = uniqueIntents.length;
        debugData.step3_deduplication.duplicates_removed = intents.length - uniqueIntents.length;

        return uniqueIntents;
    }

    /**
     * Process intents with worker pool
     */
    async processWithWorkers(intents, debugData) {
        const batches = this.createBatches(intents, this.batchSize);
        this.logger.info(`  Created ${batches.length} batches`);

        debugData.step4_ai_classification.total_batches = batches.length;

        const allResults = [];
        const queue = [...batches];
        let completedBatches = 0;
        let batchIndex = 0;

        // Assign batch IDs for tracking
        const batchesWithIds = batches.map((batch, idx) => ({
            batch_id: idx + 1,
            batch_size: batch.length,
            intents: batch
        }));

        // Process with concurrent workers
        const workers = Array(Math.min(this.workerCount, queue.length))
            .fill(null)
            .map((_, i) => this.worker(queue, allResults, i, batchesWithIds, debugData, () => {
                completedBatches++;
                this.logger.debug(`  Batch ${completedBatches}/${batches.length} complete`);
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
        let currentBatchId = 0;

        while (queue.length > 0) {
            const batch = queue.shift();
            if (!batch) break;

            currentBatchId++;
            const batchId = batchesWithIds.length - queue.length;

            try {
                this.logger.debug(`  Worker ${workerIndex + 1}: Processing batch ${batchId} of ${batch.length} intents`);
                const batchStartTime = Date.now();
                const batchResults = await this.aiService.classifyIntents(batch);
                const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);

                results.push(...batchResults);
                batchesProcessed++;

                // Track batch in debug data
                debugData.step4_ai_classification.batches.push({
                    batch_id: batchId,
                    worker_id: workerIndex + 1,
                    batch_size: batch.length,
                    duration_seconds: parseFloat(batchDuration),
                    intents_sent: batch.map(b => ({
                        link_key: b.link_key,
                        anchor_text: b.anchor_text,
                        destination_url: b.destination_url
                    })),
                    results: batchResults.map(r => ({
                        link_key: r.link_key,
                        is_mismatch: r.is_mismatch,
                        confidence: r.confidence,
                        explanation: r.explanation
                    }))
                });

                onComplete();
            } catch (error) {
                this.logger.error(`  Worker ${workerIndex + 1}: Batch ${batchId} failed - ${error.message}`);

                debugData.step4_ai_classification.batches.push({
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
     * Create batches from array
     */
    createBatches(array, size) {
        const batches = [];
        for (let i = 0; i < array.length; i += size) {
            batches.push(array.slice(i, i + size));
        }
        return batches;
    }

    /**
     * Create LINK_INTENT_MISMATCH issues from AI results
     */
    createIssues(results, debugData) {
        const issues = [];

        for (const result of results) {
            if (!result.is_mismatch) {
                // Track aligned links
                debugData.step5_issues.aligned.push({
                    link_key: result.link_key,
                    anchor_text: result.anchor_text,
                    destination_url: result.destination_url,
                    confidence: result.confidence,
                    explanation: result.explanation
                });
                continue;
            }

            // Create issue for mismatch
            const issue = {
                issue_type: 'LINK_INTENT_MISMATCH',
                url: result.source_url,
                explanation: result.explanation || 'AI detected intent mismatch between anchor text and destination page',
                evidence: {
                    anchor_text: result.anchor_text,
                    destination_url: result.destination_url,
                    destination_title: result.destination_title,
                    destination_h1: result.destination_h1,
                    confidence: result.confidence
                }
            };

            issues.push(issue);

            // Track mismatch
            debugData.step5_issues.mismatches.push({
                source_url: result.source_url,
                anchor_text: result.anchor_text,
                destination_url: result.destination_url,
                destination_title: result.destination_title,
                confidence: result.confidence,
                explanation: result.explanation
            });
        }

        return issues;
    }

    /**
     * Write trace output for debugging
     */
    async writeTraceOutput(intentObjects, results) {
        try {
            const auditDir = this.outputWriter.getOutputPath(this.auditId);

            this.logger.info('  Writing trace files to:', auditDir);

            // Write intent objects
            await this.outputWriter.writeJSON(auditDir, 'intent-objects.json', {
                generated: new Date().toISOString(),
                total: intentObjects.length,
                objects: intentObjects
            });
            this.logger.info('  ✓ intent-objects.json');

            // Write AI results
            await this.outputWriter.writeJSON(auditDir, 'ai-results.json', {
                generated: new Date().toISOString(),
                total: results.length,
                mismatches: results.filter(r => r.is_mismatch).length,
                aligned: results.filter(r => !r.is_mismatch).length,
                results: results
            });
            this.logger.info('  ✓ ai-results.json');

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

            await this.outputWriter.writeJSON(auditDir, 'ai-pipeline-debug.json', debugData);

            this.logger.info('  ✓ ai-pipeline-debug.json written');
        } catch (error) {
            this.logger.error('Failed to write pipeline debug output', { error: error.message });
        }
    }
}
