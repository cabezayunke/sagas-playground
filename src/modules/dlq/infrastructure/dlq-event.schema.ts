import { Schema, Document } from 'mongoose';

export interface DlqEvent extends Document {
  eventName: string;
  payload: any;
  createdAt: Date;
  retryCount: number;
}

export const DlqEventSchema = new Schema({
  eventName: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  retryCount: { type: Number, default: 0 },
});