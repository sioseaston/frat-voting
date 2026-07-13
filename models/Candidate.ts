import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const CandidateSchema = new Schema(
  {
    electionId: { type: Schema.Types.ObjectId, ref: 'Election', required: true, index: true },
    positionId: { type: Schema.Types.ObjectId, ref: 'Position', required: true, index: true },
    fullname: { type: String, required: true, trim: true },
    photo: { type: String, default: '' },
    platform: { type: String, required: true },
    biography: { type: String, required: true },
  },
  { timestamps: true },
)

export type Candidate = InferSchemaType<typeof CandidateSchema>
export const CandidateModel =
  (mongoose.models.Candidate as Model<Candidate>) || mongoose.model<Candidate>('Candidate', CandidateSchema)
