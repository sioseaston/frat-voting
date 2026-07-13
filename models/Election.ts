import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const ElectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft' },
    showResultsBeforeEnd: { type: Boolean, default: false },
  },
  { timestamps: true },
)

ElectionSchema.pre('save', async function enforceSingleOpen() {
  if (this.status === 'open') {
    await ElectionModel.updateMany({ _id: { $ne: this._id }, status: 'open' }, { $set: { status: 'closed' } })
  }
})

export type Election = InferSchemaType<typeof ElectionSchema>
export const ElectionModel =
  (mongoose.models.Election as Model<Election>) || mongoose.model<Election>('Election', ElectionSchema)
