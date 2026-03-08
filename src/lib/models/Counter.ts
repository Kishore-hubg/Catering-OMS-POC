import mongoose, { Schema, Document } from 'mongoose';

interface ICounter extends Omit<Document, '_id'> {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

export async function getNextOrderNumber(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    'orderNumber',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const num = counter.seq.toString().padStart(4, '0');
  return `NC-${num}`;
}

/** Ensure the order-number counter is at least minSeq (e.g. after syncing from existing orders). */
export async function setOrderNumberCounterAtLeast(minSeq: number): Promise<void> {
  const doc = await Counter.findById('orderNumber').lean();
  const current = (doc as { seq?: number } | null)?.seq ?? 0;
  if (minSeq > current) {
    await Counter.findByIdAndUpdate('orderNumber', { $set: { seq: minSeq } }, { upsert: true });
  }
}

export default Counter;
