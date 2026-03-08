import mongoose, { Schema, Document } from 'mongoose';

interface ICounter extends Document {
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

export default Counter;
