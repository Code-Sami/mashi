import { model, models, Schema, type InferSchemaType } from "mongoose";

const notificationSchema = new Schema(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },
    marketId: {
      type: Schema.Types.ObjectId,
      ref: "Market",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "market_tagged",
        "umpire_assigned",
        "umpire_market_expired",
        "market_bet_resolved",
        "group_join_request_submitted",
        "group_join_request_approved",
      ],
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = models.Notification || model("Notification", notificationSchema);
