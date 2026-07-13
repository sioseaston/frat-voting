import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const PositionSchema = new Schema(
  {
    electionId: { type: Schema.Types.ObjectId, ref: 'Election', required: true, index: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
)

PositionSchema.index({ electionId: 1, order: 1 })
PositionSchema.index({ electionId: 1, name: 1 }, { unique: true })

export type Position = InferSchemaType<typeof PositionSchema>
export const PositionModel =
  (mongoose.models.Position as Model<Position>) || mongoose.model<Position>('Position', PositionSchema)
