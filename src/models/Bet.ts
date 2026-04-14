import { model, models, Schema, type InferSchemaType } from "mongoose";

const betSchema = new Schema(
  {
    marketId: {
      type: Schema.Types.ObjectId,
      ref: "Market",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    side: {
      type: String,
      enum: ["yes", "no"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    payout: {
      type: Number,
      default: 0,
      min: 0,
    },
    yesPriceAfter: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    noPriceAfter: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  { timestamps: true }
);

export type BetDocument = InferSchemaType<typeof betSchema>;
export const BetModel = models.Bet || model("Bet", betSchema);
