import express from 'express';
import helmet from 'helmet';
import expressMongoSanitize from 'express-mongo-sanitize';
import { evaluateEvent } from './services/decisionEngine';
import { runGuardrails } from './services/guardrails';
import { AutomationRule } from './models/AutomationRule';
import { getRedis } from './config/redis';
import { logger } from './config/logger';
import type { Request, Response, NextFunction } from 'express';

export function createHttpServer() {
  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.use(expressMongoSanitize());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'rez-action-engine', timestamp: Date.now() });
  });

  app.get('/health/live', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/health/ready', async (_req: Request, res: Response) => {
    try {
      const redis = getRedis();
      await redis.ping();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'not_ready' });
    }
  });

  // POST /actions — evaluate event and decide action
  app.post('/actions', async (req: Request, res: Response, next: NextFunction) => {
    const { eventType, data, correlationId } = req.body;

    if (!eventType || !data) {
      res.status(400).json({ error: 'eventType and data are required' });
      return;
    }

    try {
      const decision = await evaluateEvent(eventType, data);

      if (!decision.shouldAct) {
        res.json({ action: 'none', reason: 'no_matching_rules', correlationId });
        return;
      }

      // Run guardrails before executing
      const guardrailResult = await runGuardrails(decision.actionLevel, data);
      if (!guardrailResult.passed) {
        logger.warn('Guardrail blocked action', { eventType, reason: guardrailResult.reason });
        res.json({ action: 'blocked', reason: guardrailResult.reason, correlationId });
        return;
      }

      logger.info('Action approved', { eventType, actionLevel: decision.actionLevel, correlationId });
      res.json({
        action: decision.actionLevel,
        matchedRules: decision.matchedRules,
        correlationId,
        approved: true,
      });
    } catch (err) {
      next(err);
    }
  });

  // Rules CRUD
  app.get('/rules', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rules = await AutomationRule.find().lean();
      res.json({ rules });
    } catch (err) {
      next(err);
    }
  });

  app.post('/rules', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = new AutomationRule(req.body);
      await rule.save();
      res.status(201).json({ rule });
    } catch (err) {
      next(err);
    }
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
