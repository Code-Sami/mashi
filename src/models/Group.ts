import { model, models, Schema, type InferSchemaType } from "mongoose";

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
  },
  { timestamps: true }
);

export type GroupDocument = InferSchemaType<typeof groupSchema>;
export const GroupModel = models.Group || model("Group", groupSchema);
