import { Schema, Document } from 'mongoose';

export interface DlqEvent extends Document {
  id: string;
  eventName: string;
  payload: Record<string, any>;
  timestamp?: number;
}

export const DlqEventSchema = new Schema({
  eventName: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  timestamp: { type: Number, default: () => Date.now() },
});

// Virtual for id compatibility
DlqEventSchema.virtual('id').get(function (this: any) {
  return this._id.toHexString();
});
DlqEventSchema.set('toJSON', { virtuals: true });