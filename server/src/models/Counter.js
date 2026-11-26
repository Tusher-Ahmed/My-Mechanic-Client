import { Schema, model } from "mongoose";

/** Atomic sequences, e.g. human-friendly order numbers (MM-1001, MM-1002, …). */
const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false });
export const Counter = model("Counter", CounterSchema);

// numbers start at 1001 so they look like real order numbers from day one
const OFFSET = 1000;

export async function nextSeq(name) {
  // $inc on a missing document starts from 0 (schema defaults don't apply to $inc), so add the offset here
  const c = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return OFFSET + c.seq;
}
