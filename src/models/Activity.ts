import { model, models, Schema } from "mongoose";

const activitySchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["market_created", "bet_placed", "market_resolved", "member_joined"],
      required: true,
      index: true,
    },
    marketId: { type: Schema.Types.ObjectId, ref: "Market", default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const ActivityModel = models.Activity || model("Activity", activitySchema);
