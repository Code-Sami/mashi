import { model, models, Schema, type InferSchemaType } from "mongoose";

const marketSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    deadline: {
      type: Date,
      required: true,
    },
    umpireId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    taggedUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    excludedUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    yesShares: {
      type: Number,
      default: 0,
      min: 0,
    },
    noShares: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalVolume: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
      index: true,
    },
    outcome: {
      type: String,
      enum: ["yes", "no", null],
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export type MarketDocument = InferSchemaType<typeof marketSchema>;
export const MarketModel = models.Market || model("Market", marketSchema);
