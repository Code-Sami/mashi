import { model, models, Schema } from "mongoose";

const marketPriceHistorySchema = new Schema(
  {
    marketId: { type: Schema.Types.ObjectId, ref: "Market", required: true, index: true },
    yesPrice: { type: Number, required: true },
    noPrice: { type: Number, required: true },
    totalVolume: { type: Number, required: true },
    source: { type: String, enum: ["bet", "seed"], default: "bet" },
  },
  { timestamps: true }
);

export const MarketPriceHistoryModel =
  models.MarketPriceHistory || model("MarketPriceHistory", marketPriceHistorySchema);
