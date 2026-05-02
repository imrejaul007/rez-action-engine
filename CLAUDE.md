# rez-action-engine

Decisions and executes actions from the event platform. Applies guardrails before executing actions.

## Build
```bash
npm run build && npm start
```
Port: 4009

## Key Files
- `src/services/decisionEngine.ts` — match events to rules
- `src/services/guardrails.ts` — safety checks before execution
- `src/models/AutomationRule.ts` — rule schema

## Env Vars
`MONGODB_URI`, `REDIS_URL`, `INTERNAL_SERVICE_TOKENS_JSON`, `SENTRY_DSN`, `REZ_FEEDBACK_SERVICE_URL`, `NEXTABIZ_URL`
