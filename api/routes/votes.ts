import mongoose from 'mongoose'
import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from '../../middleware/auth.js'
import { CandidateModel } from '../../models/Candidate.js'
import { ElectionModel } from '../../models/Election.js'
import { PositionModel } from '../../models/Position.js'
import { UserModel } from '../../models/User.js'
import { VoteModel } from '../../models/Vote.js'
import { logAudit, notifyMembers } from '../../utils/audit.js'
import { sendError } from '../../utils/http.js'
import { computeResults } from '../../utils/tally.js'

export async function submitVote(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res)
  if (!auth) return
  if (auth.role !== 'member') return sendError(res, 403, 'Only members can vote')

  const parsed = z
    .object({
      electionId: z.string().min(1),
      votes: z.array(
        z.object({
          positionId: z.string().min(1),
          candidateId: z.string().min(1),
        }),
      ),
    })
    .safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Invalid ballot payload')

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const election = await ElectionModel.findById(parsed.data.electionId).session(session)
      const now = new Date()
      if (!election || election.status !== 'open' || now < election.startDate || now > election.endDate) {
        throw new Error('Election is not open for voting')
      }

      const user = await UserModel.findById(auth.id).session(session)
      if (!user || user.hasVoted) throw new Error('Member has already voted')

      const positions = await PositionModel.find({ electionId: election._id }).session(session)
      const required = new Set(positions.map((position) => position._id.toString()))
      const submitted = new Set(parsed.data.votes.map((vote) => vote.positionId))
      for (const id of submitted) {
        if (!required.has(id)) throw new Error('Ballot contains an invalid position')
      }

      const allCandidateIds = parsed.data.votes.map((vote) => vote.candidateId)
      const uniqueIds = new Set(allCandidateIds)
      if (uniqueIds.size !== allCandidateIds.length) throw new Error('Same candidate selected for multiple positions')

      const candidates = await CandidateModel.find({
        _id: { $in: allCandidateIds },
        electionId: election._id,
      }).session(session)

      const candidateMap = new Map(candidates.map((c) => [c._id.toString(), c]))
      for (const choice of parsed.data.votes) {
        const candidate = candidateMap.get(choice.candidateId)
        if (!candidate) throw new Error('Ballot contains invalid candidates')
        if (candidate.positionId.toString() !== choice.positionId) throw new Error('Candidate does not match the selected position')
      }

      await VoteModel.create([{ userId: user._id, electionId: election._id, votes: parsed.data.votes }], { session })
      await UserModel.updateOne({ _id: user._id, hasVoted: false }, { $set: { hasVoted: true } }, { session })
    })

    logAudit(auth.id, auth.role, 'vote', 'election', parsed.data.electionId, 'Cast ballot')

    const remaining = await UserModel.countDocuments({ role: 'member', status: 'active', hasVoted: false })
    if (remaining === 0) {
      await ElectionModel.findByIdAndUpdate(parsed.data.electionId, { status: 'closed' })
      const election = await ElectionModel.findById(parsed.data.electionId)
      if (election) {
        logAudit('system', 'system', 'update', 'election', election._id.toString(), 'Auto-closed — all members voted')
        notifyMembers(election.title, 'closed')
      }
    }

    return res.status(201).json({ ok: true })
  } finally {
    await session.endSession()
  }
}

export async function getResults(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res)
  if (!auth) return

  const electionIdParam = typeof req.query.electionId === 'string' ? req.query.electionId : undefined
  const election = electionIdParam
    ? await ElectionModel.findById(electionIdParam)
    : (await ElectionModel.findOne({ status: 'open' }).sort({ createdAt: -1 })) ||
      (await ElectionModel.findOne({ status: 'closed' }).sort({ endDate: -1 }))
  if (!election) return res.status(200).json({ election: null, totalVotes: 0, voterTurnout: 0, results: [] })

  const [positions, candidates, ballots, memberCount] = await Promise.all([
    PositionModel.find({ electionId: election._id }).sort({ order: 1 }),
    CandidateModel.find({ electionId: election._id }),
    VoteModel.find({ electionId: election._id }),
    UserModel.countDocuments({ role: 'member' }),
  ])

  const rawBallots = ballots.map((b) => ({
    votes: b.votes.map((v) => {
      const raw = v as Record<string, unknown>
      const positionId = (v.positionId ?? raw.positionId)?.toString() ?? ''
      let candidateId: string
      if (raw.candidateId) {
        candidateId = raw.candidateId.toString()
      } else if (Array.isArray(raw.candidateIds) && (raw.candidateIds as string[]).length) {
        candidateId = (raw.candidateIds as string[])[0]
      } else {
        candidateId = ''
      }
      return { positionId, candidateId }
    }),
  }))

  const results = positions.map((position) => {
    const positionCandidates = candidates
      .filter((candidate) => candidate.positionId.toString() === position._id.toString())
      .map((c) => ({ _id: c._id.toString(), fullname: c.fullname, photo: c.photo }))
    const result = computeResults(positionCandidates, rawBallots, position._id.toString())
    return {
      positionId: position._id,
      name: position.name,
      order: position.order,
      totalVotes: result.totalVotes,
      candidates: result.candidates,
    }
  })

  return res.status(200).json({
    election,
    totalVotes: ballots.length,
    voterTurnout: memberCount ? Math.round((ballots.length / memberCount) * 100) : 0,
    results,
  })
}
