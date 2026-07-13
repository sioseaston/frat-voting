import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const PasswordResetTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
})

PasswordResetTokenSchema.index({ tokenHash: 1 })
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type PasswordResetToken = InferSchemaType<typeof PasswordResetTokenSchema>
export const PasswordResetTokenModel =
  (mongoose.models.PasswordResetToken as Model<PasswordResetToken>) ||
  mongoose.model<PasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema)
