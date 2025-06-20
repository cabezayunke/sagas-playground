import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ toJSON: { virtuals: true } })
export class DlqEvent extends Document {
  @Prop({ required: true })
  eventName!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, any>;

  @Prop({ default: () => Date.now() })
  timestamp?: number;
}

export const DlqEventSchema = SchemaFactory.createForClass(DlqEvent);

// Virtual for id compatibility
DlqEventSchema.virtual('id').get(function (this: any) {
  return this._id.toHexString();
});
DlqEventSchema.set('toJSON', { virtuals: true });