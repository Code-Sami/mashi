import { model, models, Schema, type InferSchemaType } from "mongoose";

const joinRequestSchema = new Schema(
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
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
    },
  },
  { timestamps: true }
);

joinRequestSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export type JoinRequestDocument = InferSchemaType<typeof joinRequestSchema>;
export const JoinRequestModel = models.JoinRequest || model("JoinRequest", joinRequestSchema);
