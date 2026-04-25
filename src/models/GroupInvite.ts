import { model, models, Schema } from "mongoose";

const groupInviteSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    joinMode: {
      type: String,
      enum: ["auto", "request"],
      default: "auto",
      index: true,
    },
    useCount: { type: Number, default: 0 },
    maxUses: { type: Number, default: null },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const GroupInviteModel = models.GroupInvite || model("GroupInvite", groupInviteSchema);
