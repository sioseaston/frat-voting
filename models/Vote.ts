import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const VoteChoiceSchema = new Schema(
  {
    positionId: { type: Schema.Types.ObjectId, ref: 'Position', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
  },
  { _id: false },
)

const VoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    electionId: { type: Schema.Types.ObjectId, ref: 'Election', required: true, index: true },
    votes: { type: [VoteChoiceSchema], required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

VoteSchema.index({ userId: 1, electionId: 1 }, { unique: true })

export type Vote = InferSchemaType<typeof VoteSchema>
export const VoteModel = (mongoose.models.Vote as Model<Vote>) || mongoose.model<Vote>('Vote', VoteSchema)
