import Anthropic from '@anthropic-ai/sdk';
import { Logger } from './logger.js';

/**
 * AI Service for Link Intent Analysis
 * Supports multiple AI providers: Claude (Anthropic), Gemini (Google), and OpenAI
 * 
 * SWITCH PROVIDERS:
 *   - Set AI_PROVIDER=gemini, AI_PROVIDER=claude, or AI_PROVIDER=openai in .env
 *   - Or pass { provider: 'gemini' | 'claude' | 'openai' } to AIService options
 * 
 * DISABLE AI:
 *   - Set ENABLE_AI_ANALYSIS=false in .env
 *   - Or pass { enabled: false } to Auditor options
 */
export class AIService {
    constructor(options = {}) {
        this.logger = new Logger('AI_SERVICE');

        // Provider selection (default to gemini if key exists, otherwise claude, then openai)
        const envProvider = process.env.AI_PROVIDER?.toLowerCase();
        const hasGeminiKey = !!process.env.GEMINI_API_KEY;
        const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY;
        const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

        // Priority: options > env > auto-detect
        if (options.provider) {
            this.provider = options.provider.toLowerCase();
        } else if (envProvider && ['claude', 'gemini', 'openai'].includes(envProvider)) {
            this.provider = envProvider;
        } else if (hasGeminiKey) {
            this.provider = 'gemini';
        } else if (hasClaudeKey) {
            this.provider = 'claude';
        } else if (hasOpenAIKey) {
            this.provider = 'openai';
        } else {
            this.provider = 'none';
        }

        this.enabled = options.enabled !== false;
        this.maxTokens = 1024;

        this.logger.info('═══════════════════════════════════════════════════════════');
        this.logger.info('              AI SERVICE INITIALIZATION                     ');
        this.logger.info('═══════════════════════════════════════════════════════════');
        this.logger.info(`  Provider: ${this.provider.toUpperCase()}`);

        // Initialize the selected provider
        if (this.provider === 'gemini') {
            this.initGemini();
        } else if (this.provider === 'claude') {
            this.initClaude();
        } else if (this.provider === 'openai') {
            this.initOpenAI();
        } else {
            this.logger.error('✗ No AI provider configured');
            this.logger.info('  Set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY in .env');
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

    initGemini() {
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.geminiModel = 'gemini-2.0-flash';
        this.geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent`;

        if (this.geminiApiKey) {
            this.logger.success('✓ GEMINI_API_KEY found');
            this.logger.info(`  Model: ${this.geminiModel}`);
            this.client = 'gemini';
        } else {
            this.logger.error('✗ GEMINI_API_KEY not configured');
        }
    }

    initClaude() {
        this.claudeApiKey = process.env.ANTHROPIC_API_KEY;
        this.claudeModel = 'claude-3-5-haiku-latest';

        if (this.claudeApiKey) {
            this.claudeClient = new Anthropic({ apiKey: this.claudeApiKey });
            this.logger.success('✓ ANTHROPIC_API_KEY found');
            this.logger.info(`  Model: ${this.claudeModel}`);
            this.client = 'claude';
        } else {
            this.logger.error('✗ ANTHROPIC_API_KEY not configured');
        }
    }

    initOpenAI() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.openaiModel = 'gpt-5-mini';  // User requested this model
        this.openaiEndpoint = 'https://api.openai.com/v1/chat/completions';

        if (this.openaiApiKey) {
            this.logger.success('✓ OPENAI_API_KEY found');
            this.logger.info(`  Model: ${this.openaiModel}`);
            this.client = 'openai';
        } else {
            this.logger.error('✗ OPENAI_API_KEY not configured');
        }
    }

    isEnabled() {
        const hasClient = !!this.client;
        const optionsEnabled = this.enabled;
        const envEnabled = process.env.ENABLE_AI_ANALYSIS !== 'false';

        const enabled = hasClient && optionsEnabled && envEnabled;

        this.logger.debug('AI enabled check:', {
            provider: this.provider,
            hasClient,
            optionsEnabled,
            envEnabled,
            result: enabled
        });

        return enabled;
    }

    getProvider() {
        return this.provider;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // LINK INTENT CLASSIFICATION
    // ─────────────────────────────────────────────────────────────────────────────

    async classifyIntents(links) {
        if (!this.isEnabled()) {
            this.logger.warn('AI Service not enabled - returning empty results');
            return [];
        }

        if (!links || links.length === 0) {
            this.logger.debug('No links to classify');
            return [];
        }

        this.logger.info(`──── AI REQUEST (${this.provider.toUpperCase()}): ${links.length} links ────`);

        if (this.provider === 'gemini') {
            return this.classifyWithGemini(links);
        } else if (this.provider === 'claude') {
            return this.classifyWithClaude(links);
        } else if (this.provider === 'openai') {
            return this.classifyWithOpenAI(links);
        }

        return [];
    }

    async classifyWithGemini(links) {
        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.buildUserPrompt(links);

        try {
            const startTime = Date.now();

            const response = await fetch(`${this.geminiEndpoint}?key=${this.geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                    generationConfig: { maxOutputTokens: this.maxTokens, temperature: 0.1 }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            this.logger.debug(`Response received in ${duration}s`);
            const results = this.parseResponse(content, links);
            const mismatches = results.filter(r => r.is_mismatch);
            this.logger.info(`──── GEMINI RESPONSE: ${results.length} results, ${mismatches.length} mismatches ────`);

            return results;
        } catch (error) {
            this.logger.error(`──── GEMINI REQUEST FAILED: ${error.message} ────`);
            return [];
        }
    }

    async classifyWithClaude(links) {
        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.buildUserPrompt(links);

        try {
            const startTime = Date.now();

            const response = await this.claudeClient.messages.create({
                model: this.claudeModel,
                max_tokens: this.maxTokens,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const content = response.content[0]?.text || '';

            this.logger.debug(`Response received in ${duration}s`);
            const results = this.parseResponse(content, links);
            const mismatches = results.filter(r => r.is_mismatch);
            this.logger.info(`──── CLAUDE RESPONSE: ${results.length} results, ${mismatches.length} mismatches ────`);

            return results;
        } catch (error) {
            this.logger.error(`──── CLAUDE REQUEST FAILED: ${error.message} ────`);
            return [];
        }
    }

    async classifyWithOpenAI(links) {
        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.buildUserPrompt(links);

        try {
            const startTime = Date.now();

            const response = await fetch(this.openaiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: this.openaiModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1,
                    max_tokens: this.maxTokens
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const content = data.choices?.[0]?.message?.content || '';

            this.logger.debug(`Response received in ${duration}s`);
            const results = this.parseResponse(content, links);
            const mismatches = results.filter(r => r.is_mismatch);
            this.logger.info(`──── OPENAI RESPONSE: ${results.length} results, ${mismatches.length} mismatches ────`);

            return results;
        } catch (error) {
            this.logger.error(`──── OPENAI REQUEST FAILED: ${error.message} ────`);
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PAGE INTENT CLASSIFICATION (SOFT_404 & PAGE_INTENT_MISMATCH)
    // ─────────────────────────────────────────────────────────────────────────────

    async classifyPageIntent(pageObjects) {
        if (!this.isEnabled()) {
            this.logger.warn('AI Service not enabled - returning empty results');
            return [];
        }

        if (!pageObjects || pageObjects.length === 0) {
            this.logger.debug('No pages to classify');
            return [];
        }

        this.logger.info(`──── PAGE INTENT REQUEST (${this.provider.toUpperCase()}): ${pageObjects.length} pages ────`);

        if (this.provider === 'gemini') {
            return this.classifyPageIntentWithGemini(pageObjects);
        } else if (this.provider === 'claude') {
            return this.classifyPageIntentWithClaude(pageObjects);
        } else if (this.provider === 'openai') {
            return this.classifyPageIntentWithOpenAI(pageObjects);
        }

        return [];
    }

    async classifyPageIntentWithGemini(pageObjects) {
        const systemPrompt = this.buildPageIntentPrompt();
        const userPrompt = JSON.stringify({ pages: pageObjects }, null, 2);

        try {
            const startTime = Date.now();

            const response = await fetch(`${this.geminiEndpoint}?key=${this.geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                    generationConfig: { maxOutputTokens: this.maxTokens, temperature: 0.1 }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            this.logger.debug(`Response received in ${duration}s`);
            return this.parsePageIntentResponse(content, pageObjects);
        } catch (error) {
            this.logger.error(`──── GEMINI PAGE INTENT FAILED: ${error.message} ────`);
            return [];
        }
    }

    async classifyPageIntentWithClaude(pageObjects) {
        const systemPrompt = this.buildPageIntentPrompt();
        const userPrompt = JSON.stringify({ pages: pageObjects }, null, 2);

        try {
            const startTime = Date.now();

            const response = await this.claudeClient.messages.create({
                model: this.claudeModel,
                max_tokens: this.maxTokens,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const content = response.content[0]?.text || '';

            this.logger.debug(`Response received in ${duration}s`);
            return this.parsePageIntentResponse(content, pageObjects);
        } catch (error) {
            this.logger.error(`──── CLAUDE PAGE INTENT FAILED: ${error.message} ────`);
            return [];
        }
    }

    async classifyPageIntentWithOpenAI(pageObjects) {
        const systemPrompt = this.buildPageIntentPrompt();
        const userPrompt = JSON.stringify({ pages: pageObjects }, null, 2);

        try {
            const startTime = Date.now();

            const response = await fetch(this.openaiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: this.openaiModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1,
                    max_tokens: this.maxTokens
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || ''}`);
            }

            const data = await response.json();
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const content = data.choices?.[0]?.message?.content || '';

            this.logger.debug(`Response received in ${duration}s`);
            return this.parsePageIntentResponse(content, pageObjects);
        } catch (error) {
            this.logger.error(`──── OPENAI PAGE INTENT FAILED: ${error.message} ────`);
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PROMPTS
    // ─────────────────────────────────────────────────────────────────────────────

    getSystemPrompt() {
        return `Role: You are an SEO intent analysis engine.

Your task is to determine whether the anchor text intent of an internal link matches the destination page intent.

Definitions:
- Anchor Text Intent: What a user expects after clicking, inferred from anchor text
- Destination Page Intent: What the page is about, from title/H1/meta

What counts as a mismatch (is_mismatch = true):
- Anchor text strongly implies different topic/purpose than destination
- E.g. "Pricing" → Blog article, "Compare plans" → Contact page

NOT mismatches:
- Vague anchors ("Learn more") → informational pages
- Brand anchors → product pages
- Related content navigation

Rules:
- Be conservative - only flag clear mismatches
- Return valid JSON only

Output Format:
Return JSON: { "results": [{ "index": 0, "is_mismatch": true/false, "confidence": 0.0-1.0, "explanation": "..." }] }`;
    }

    buildUserPrompt(links) {
        const linksData = links.map((link, index) => ({
            index,
            anchor_text: link.anchor_text,
            destination_title: link.destination_title || '(no title)',
            destination_h1: link.destination_h1 || '(no h1)',
            destination_meta: link.destination_meta || '(no description)'
        }));

        return `Analyze these ${links.length} internal links for intent mismatch:\n\n${JSON.stringify(linksData, null, 2)}`;
    }

    buildPageIntentPrompt() {
        return `Role: You are a page intent analyzer detecting SOFT_404 and PAGE_INTENT_MISMATCH issues.

## SOFT_404
HTTP 200 but content says "not found", "unavailable", "no results", "oops", etc.

## PAGE_INTENT_MISMATCH
URL path implies one intent, but content serves different purpose.
E.g. /blog/article → product page, /pricing → blog post

Rules:
- Be conservative
- Only flag clear issues
- Return valid JSON

Output Format:
{ "results": [{ "index": 0, "url": "...", "is_soft_404": false, "is_intent_mismatch": false, "confidence": 0.8, "explanation": "..." }] }`;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RESPONSE PARSING
    // ─────────────────────────────────────────────────────────────────────────────

    parseResponse(content, originalLinks) {
        try {
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            const parsed = JSON.parse(jsonStr);
            const results = parsed.results || parsed;

            if (!Array.isArray(results)) {
                this.logger.warn('AI response is not an array');
                return [];
            }

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
            this.logger.error(`Failed to parse AI response: ${error.message}`);
            return [];
        }
    }

    parsePageIntentResponse(content, originalPages) {
        try {
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            const parsed = JSON.parse(jsonStr);
            const results = parsed.results || parsed;

            if (!Array.isArray(results)) {
                this.logger.warn('AI response is not an array');
                return [];
            }

            const soft404s = results.filter(r => r.is_soft_404);
            const mismatches = results.filter(r => r.is_intent_mismatch);
            this.logger.info(`──── ${this.provider.toUpperCase()} PAGE INTENT: ${results.length} results ────`);
            this.logger.info(`  Soft 404s: ${soft404s.length}`);
            this.logger.info(`  Intent mismatches: ${mismatches.length}`);

            return results.map((result, i) => {
                const originalPage = originalPages[result.index ?? i];
                return {
                    url: result.url || originalPage?.url,
                    is_soft_404: result.is_soft_404 === true,
                    is_intent_mismatch: result.is_intent_mismatch === true,
                    confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
                    explanation: result.explanation || ''
                };
            });
        } catch (error) {
            this.logger.error(`Failed to parse page intent response: ${error.message}`);
            return [];
        }
    }
}
