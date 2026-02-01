import Anthropic from '@anthropic-ai/sdk';
import { Logger } from './logger.js';

/**
 * AI Service for Link Intent Analysis
 * Uses Anthropic Claude Haiku 3.5 for intent mismatch detection
 * 
 * DISABLE AI:
 *   - Set ENABLE_AI_ANALYSIS=false in .env
 *   - Or pass { enableAI: false } to Auditor options
 */
export class AIService {
    constructor(options = {}) {
        this.logger = new Logger('AI_SERVICE');
        this.apiKey = process.env.ANTHROPIC_API_KEY;
        this.enabled = options.enabled !== false; // Default enabled
        this.model = 'claude-3-5-haiku-latest';
        this.maxTokens = 1024;

        this.logger.info('═══════════════════════════════════════════════════════════');
        this.logger.info('              AI SERVICE INITIALIZATION                     ');
        this.logger.info('═══════════════════════════════════════════════════════════');

        if (this.apiKey) {
            this.client = new Anthropic({ apiKey: this.apiKey });
            this.logger.success('✓ ANTHROPIC_API_KEY found');
            this.logger.info(`  Model: ${this.model}`);
            this.logger.info(`  Max tokens: ${this.maxTokens}`);
        } else {
            this.logger.error('✗ ANTHROPIC_API_KEY not configured');
            this.logger.info('  AI analysis will be disabled');
        }

        if (!this.enabled) {
            this.logger.warn('⚠️  AI explicitly disabled via options');
        }

        if (process.env.ENABLE_AI_ANALYSIS === 'false') {
            this.logger.warn('⚠️  AI disabled via ENABLE_AI_ANALYSIS=false');
        }

        this.logger.info(`  Final status: ${this.isEnabled() ? '✓ ENABLED' : '✗ DISABLED'}`);
        this.logger.info('═══════════════════════════════════════════════════════════');
    }

    /**
     * Check if AI service is available and enabled
     */
    isEnabled() {
        const hasApiKey = !!this.apiKey;
        const hasClient = !!this.client;
        const optionsEnabled = this.enabled;
        const envEnabled = process.env.ENABLE_AI_ANALYSIS !== 'false';

        const enabled = hasApiKey && hasClient && optionsEnabled && envEnabled;

        this.logger.debug('AI enabled check:', {
            hasApiKey,
            hasClient,
            optionsEnabled,
            envEnabled,
            result: enabled
        });

        return enabled;
    }

    /**
     * Classify a batch of intent objects
     * @param {Array} links - Array of intent objects with anchor_text and destination metadata
     * @returns {Array} Classification results with is_mismatch, confidence, explanation
     */
    async classifyIntents(links) {
        if (!this.isEnabled()) {
            this.logger.warn('AI Service not enabled - returning empty results');
            return [];
        }

        if (!links || links.length === 0) {
            this.logger.debug('No links to classify');
            return [];
        }

        this.logger.info(`──── AI REQUEST: ${links.length} links ────`);

        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.buildUserPrompt(links);

        // Log what we're sending
        this.logger.debug('Request payload:');
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            this.logger.debug(`  [${i}] "${link.anchor_text}" → ${link.destination_title || '(no title)'}`);
        }

        try {
            this.logger.debug('Sending to Anthropic API...');
            const startTime = Date.now();

            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: this.maxTokens,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ]
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const content = response.content[0]?.text || '';

            this.logger.debug(`Response received in ${duration}s`);
            this.logger.debug(`Response length: ${content.length} chars`);
            this.logger.debug('Raw response:', content.substring(0, 500) + (content.length > 500 ? '...' : ''));

            const results = this.parseResponse(content, links);

            // Log results summary
            const mismatches = results.filter(r => r.is_mismatch);
            this.logger.info(`──── AI RESPONSE: ${results.length} results, ${mismatches.length} mismatches ────`);

            for (const result of results) {
                const icon = result.is_mismatch ? '⚠️ ' : '✓ ';
                this.logger.debug(`  ${icon} "${result.anchor_text}" → ${result.is_mismatch ? 'MISMATCH' : 'OK'} (${(result.confidence * 100).toFixed(0)}%)`);
            }

            return results;
        } catch (error) {
            this.logger.error('──── AI REQUEST FAILED ────');
            this.logger.error(`  Error: ${error.message}`);
            this.logger.error(`  Stack: ${error.stack?.split('\n')[1]}`);

            if (error.status === 401) {
                this.logger.error('  → Invalid API key');
            } else if (error.status === 429) {
                this.logger.error('  → Rate limited - too many requests');
            } else if (error.status === 500) {
                this.logger.error('  → Anthropic server error');
            }

            return [];
        }
    }

    /**
     * System prompt for SEO intent analysis
     */
    getSystemPrompt() {
        return `Role: You are an SEO intent analysis engine.

Your task is to determine whether the anchor text intent of an internal link matches the destination page intent, using only the information provided.

You do not evaluate crawl quality, page quality, or UX — only intent alignment.

Definitions:
- Anchor Text Intent: What a reasonable user expects to find after clicking the link, inferred from the anchor text alone.
- Destination Page Intent: What the destination page is primarily about, inferred from the title, H1, and meta description.

What counts as a mismatch:
A link is an intent mismatch ONLY if:
- The anchor text strongly implies a different topic, purpose, or user action
- AND the destination page clearly serves a different primary intent

Examples of TRUE mismatches:
- Anchor: "Pricing" → Destination: Blog article
- Anchor: "How CBD helps sleep" → Destination: Product category
- Anchor: "Compare plans" → Destination: Contact page

Examples of NOT mismatches:
- Slightly vague anchors ("Learn more", "Explore") → informational pages
- Broad anchors pointing to broader category pages
- Brand or product-name anchors pointing to product pages
- Editorial anchors pointing to related but not identical content

Strict Rules:
- Do NOT infer intent beyond provided text
- Do NOT penalize vague but non-misleading anchors
- Be conservative - only flag clear mismatches
- Return valid JSON only

Output Format:
Return a JSON array with one object per link:
[
  {
    "index": 0,
    "is_mismatch": true | false,
    "confidence": 0.0 - 1.0,
    "explanation": "Brief explanation"
  }
]`;
    }

    /**
     * Build user prompt from links
     */
    buildUserPrompt(links) {
        const linksData = links.map((link, index) => ({
            index,
            anchor_text: link.anchor_text,
            destination_title: link.destination_title || '(no title)',
            destination_h1: link.destination_h1 || '(no h1)',
            destination_meta: link.destination_meta || '(no description)'
        }));

        return `Analyze the following ${links.length} internal links for intent mismatch:

${JSON.stringify(linksData, null, 2)}

Return your analysis as a JSON array.`;
    }

    /**
     * Parse AI response into structured results
     */
    parseResponse(content, originalLinks) {
        try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
                this.logger.debug('Extracted JSON from code block');
            }

            const results = JSON.parse(jsonStr);

            if (!Array.isArray(results)) {
                this.logger.warn('AI response is not an array');
                return [];
            }

            this.logger.debug(`Parsed ${results.length} results from AI response`);

            // Map results back to original links
            return results.map((result, i) => {
                const originalLink = originalLinks[result.index ?? i];
                return {
                    link_key: originalLink?.link_key || `unknown-${i}`,
                    source_url: originalLink?.source_url,
                    destination_url: originalLink?.destination_url,
                    anchor_text: originalLink?.anchor_text,
                    destination_title: originalLink?.destination_title,
                    destination_h1: originalLink?.destination_h1,
                    is_mismatch: result.is_mismatch === true,
                    confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
                    explanation: result.explanation || ''
                };
            });
        } catch (error) {
            this.logger.error('Failed to parse AI response');
            this.logger.error(`  Parse error: ${error.message}`);
            this.logger.debug(`  Content was: ${content.substring(0, 200)}...`);
            return [];
        }
    }
}
