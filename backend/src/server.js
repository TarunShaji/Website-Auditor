import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Auditor } from './auditor.js';
import { Logger } from './utils/logger.js';

const app = express();
const PORT = 3001;
const logger = new Logger('SERVER');

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
      duration: `${duration}ms`
    });
  });

  next();
});

const activeAudits = new Map();

app.post('/api/audit', async (req, res) => {
  const { url, maxPages, unlimited, enableAI } = req.body;

  logger.info('Audit request received', { url, maxPages, unlimited, enableAI });

  if (!url) {
    logger.warn('Audit request rejected: URL missing');
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    new URL(url);
  } catch (e) {
    logger.warn('Audit request rejected: Invalid URL', { url, error: e.message });
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const auditId = Date.now().toString();

  logger.success('Audit created', { auditId, url, mode: unlimited ? 'UNLIMITED' : 'LIMITED' });

  res.json({
    auditId,
    message: 'Audit started',
    statusUrl: `/api/audit/${auditId}/status`
  });

  const progressEvents = [];

  const auditor = new Auditor(url, {
    maxPages: unlimited ? 0 : (maxPages || 100),
    unlimited: unlimited === true,
    auditId: auditId,
    enableAI: enableAI !== false,
    onProgress: (event) => {
      progressEvents.push({
        timestamp: Date.now(),
        ...event
      });
    }
  });

  activeAudits.set(auditId, {
    status: 'running',
    progress: progressEvents,
    result: null,
    error: null
  });

  logger.info('Starting audit execution', { auditId });

  auditor.audit()
    .then(result => {
      logger.success('Audit completed successfully', {
        auditId,
        pagesCrawled: result.crawl_stats.pages_crawled,
        issuesFound: result.crawl_stats.issues_found
      });
      activeAudits.set(auditId, {
        status: 'completed',
        progress: progressEvents,
        result: result,
        error: null
      });
    })
    .catch(error => {
      logger.error('Audit failed', { auditId, error: error.message });
      activeAudits.set(auditId, {
        status: 'failed',
        progress: progressEvents,
        result: null,
        error: error.message
      });
    });
});

app.get('/api/audit/:auditId/status', (req, res) => {
  const { auditId } = req.params;
  const audit = activeAudits.get(auditId);

  if (!audit) {
    logger.warn('Status check for non-existent audit', { auditId });
    return res.status(404).json({ error: 'Audit not found' });
  }

  logger.debug('Status check', { auditId, status: audit.status });
  res.json(audit);
});

app.get('/api/audit/:auditId/result', (req, res) => {
  const { auditId } = req.params;
  const audit = activeAudits.get(auditId);

  if (!audit) {
    logger.warn('Result request for non-existent audit', { auditId });
    return res.status(404).json({ error: 'Audit not found' });
  }

  if (audit.status !== 'completed') {
    logger.warn('Result request for incomplete audit', { auditId, status: audit.status });
    return res.status(400).json({
      error: 'Audit not completed',
      status: audit.status
    });
  }

  logger.info('Result retrieved', { auditId });
  res.json(audit.result);
});

app.get('/', (req, res) => {
  res.json({
    service: 'Verisite Backend API',
    version: '1.0.0',
    endpoints: {
      audit: 'POST /api/audit',
      status: 'GET /api/audit/:auditId/status',
      result: 'GET /api/audit/:auditId/result',
      health: 'GET /health'
    }
  });
});

app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'ok',
    service: 'Verisite Backend',
    uptime: `${uptime.toFixed(2)}s`,
    memory: {
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
    },
    activeAudits: activeAudits.size
  });
});

app.listen(PORT, () => {
  logger.success('=== VERISITE BACKEND STARTED ===', {
    port: PORT,
    url: `http://localhost:${PORT}`,
    endpoints: [
      'POST /api/audit',
      'GET /api/audit/:id/status',
      'GET /api/audit/:id/result',
      'GET /health'
    ]
  });
  console.log(`\n🚀 Verisite backend running on http://localhost:${PORT}\n`);
});
