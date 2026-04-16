import { model, models, Schema, type InferSchemaType } from "mongoose";

const moderationLogSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    verdict: {
      type: String,
      enum: ["rejected", "overridden"],
      default: "rejected",
    },
    reason: {
      type: String,
      required: true,
    },
    overriddenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    marketId: {
      type: Schema.Types.ObjectId,
      ref: "Market",
      default: null,
    },
  },
  { timestamps: true }
);

export type ModerationLogDocument = InferSchemaType<typeof moderationLogSchema>;
export const ModerationLogModel =
  models.ModerationLog || model("ModerationLog", moderationLogSchema);
