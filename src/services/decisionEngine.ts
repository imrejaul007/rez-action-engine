import { AutomationRule } from '../models/AutomationRule';
import { logger } from '../config/logger';

export type ActionLevel = 'draft_po' | 'notify' | 'escalate';

export interface DecisionResult {
  actionLevel: ActionLevel;
  matchedRules: string[];
  shouldAct: boolean;
}

export async function evaluateEvent(
  eventType: string,
  data: Record<string, unknown>
): Promise<DecisionResult> {
  const rules = await AutomationRule.find({ eventType, enabled: true });

  if (rules.length === 0) {
    logger.debug('No rules matched for event', { eventType });
    return { actionLevel: 'notify', matchedRules: [], shouldAct: false };
  }

  const matchedRules: string[] = [];

  for (const rule of rules) {
    const conditions = rule.conditions;
    if (evaluateConditions(conditions, data)) {
      matchedRules.push(rule.ruleId);
      logger.info('Rule matched', { ruleId: rule.ruleId, eventType });
    }
  }

  if (matchedRules.length === 0) {
    return { actionLevel: 'notify', matchedRules: [], shouldAct: false };
  }

  // Highest severity action wins
  const actionPriority: ActionLevel[] = ['draft_po', 'escalate', 'notify'];
  const topRule = rules.find((r) => matchedRules.includes(r.ruleId));
  const actionLevel = topRule ? topRule.actionType : 'notify';

  return {
    actionLevel,
    matchedRules,
    shouldAct: true,
  };
}

function evaluateConditions(conditions: Record<string, unknown>, data: Record<string, unknown>): boolean {
  // Simple condition evaluator
  for (const [key, expected] of Object.entries(conditions)) {
    const actual = data[key];
    if (actual !== expected) return false;
  }
  return true;
}
