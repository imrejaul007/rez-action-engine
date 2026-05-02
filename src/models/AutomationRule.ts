import mongoose, { Schema, Document } from 'mongoose';

export interface IAutomationRule extends Document {
  ruleId: string;
  name: string;
  eventType: string;
  conditions: Record<string, unknown>;
  actionType: 'draft_po' | 'notify' | 'escalate';
  actionConfig: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationRuleSchema = new Schema<IAutomationRule>(
  {
    ruleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    conditions: { type: Schema.Types.Mixed },
    actionType: { type: String, enum: ['draft_po', 'notify', 'escalate'], required: true },
    actionConfig: { type: Schema.Types.Mixed },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AutomationRuleSchema.index({ eventType: 1, enabled: 1 });

export const AutomationRule = mongoose.model<IAutomationRule>('AutomationRule', AutomationRuleSchema);
