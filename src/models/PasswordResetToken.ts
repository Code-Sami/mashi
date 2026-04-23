import { model, models, Schema, type InferSchemaType } from "mongoose";

const passwordResetTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Legacy: older rows marked consumed only with usedAt; prefer `used`. */
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetTokenDocument = InferSchemaType<typeof passwordResetTokenSchema>;
export const PasswordResetTokenModel =
  models.PasswordResetToken || model("PasswordResetToken", passwordResetTokenSchema);
