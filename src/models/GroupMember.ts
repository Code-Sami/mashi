import { model, models, Schema } from "mongoose";

const groupMemberSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
  },
  { timestamps: true }
);

groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export const GroupMemberModel = models.GroupMember || model("GroupMember", groupMemberSchema);
