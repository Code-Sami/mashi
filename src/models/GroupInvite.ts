import { model, models, Schema } from "mongoose";

const groupInviteSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const GroupInviteModel = models.GroupInvite || model("GroupInvite", groupInviteSchema);
