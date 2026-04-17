import { model, models, Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    // Kept for backward compatibility with earlier seeded schema.
    name: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    isBot: {
      type: Boolean,
      default: false,
    },
    botPersona: {
      type: String,
      default: null,
    },
    botProvider: {
      type: String,
      default: null,
    },
    botModel: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = models.User || model("User", userSchema);
