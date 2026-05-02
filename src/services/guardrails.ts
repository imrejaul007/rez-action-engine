import { logger } from '../config/logger';

export interface GuardrailCheck {
  passed: boolean;
  reason?: string;
}

export async function runGuardrails(
  actionType: string,
  data: Record<string, unknown>
): Promise<GuardrailCheck> {
  // Guardrail 1: Max PO value
  if (actionType === 'draft_po') {
    const poValue = data['estimated_value'] as number;
    if (poValue && poValue > 100000) {
      logger.warn('Guardrail triggered: PO value exceeds limit', { poValue });
      return { passed: false, reason: 'PO value exceeds max allowed (100000)' };
    }
  }

  // Guardrail 2: Rate limit per merchant
  // (Implementation would check Redis for rate limit)

  return { passed: true };
}
