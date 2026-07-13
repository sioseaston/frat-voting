import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const AuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, default: '' },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String, default: '' },
    details: { type: String, default: '' },
  },
  { timestamps: true },
)

AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ resource: 1, action: 1 })

export type AuditLog = InferSchemaType<typeof AuditLogSchema>
export const AuditLogModel =
  (mongoose.models.AuditLog as Model<AuditLog>) || mongoose.model<AuditLog>('AuditLog', AuditLogSchema)
