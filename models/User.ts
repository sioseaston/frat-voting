import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from 'mongoose'

const UserSchema = new Schema(
  {
    membershipNumber: { type: String, required: true, unique: true, trim: true },
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    hasVoted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

UserSchema.set('toJSON', {
  transform(_doc, ret) {
    const sanitized = ret as Record<string, unknown>
    delete sanitized.password
    delete sanitized.__v
    return ret
  },
})

export type User = InferSchemaType<typeof UserSchema>
export type UserDocument = HydratedDocument<User>
export const UserModel = (mongoose.models.User as Model<User>) || mongoose.model<User>('User', UserSchema)
