import { Worker } from 'bullmq';
import { getRedis } from './config/redis';
import { logger } from './config/logger';
import { evaluateEvent } from './services/decisionEngine';
import { runGuardrails } from './services/guardrails';

let worker: Worker;

export async function createWorker(): Promise<Worker> {
  const redis = getRedis();
  worker = new Worker(
    'action-processing',
    async (job) => {
      const { eventType, data, correlationId } = job.data;
      const decision = await evaluateEvent(eventType, data);

      if (!decision.shouldAct) return { action: 'none' };

      const guardrailResult = await runGuardrails(decision.actionLevel, data);
      if (!guardrailResult.passed) return { action: 'blocked', reason: guardrailResult.reason };

      logger.info('Action job executed', { eventType, action: decision.actionLevel, correlationId });
      return { action: decision.actionLevel, matchedRules: decision.matchedRules };
    },
    { connection: redis as never, concurrency: 10 }
  );

  worker.on('failed', (job, err) => {
    logger.error('Action job failed', { jobId: job?.id, error: err.message });
  });

  logger.info('Action worker started');
  return worker;
}
