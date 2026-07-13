import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../middleware/auth.js'
import { CandidateModel } from '../../models/Candidate.js'
import { ElectionModel } from '../../models/Election.js'
import { PositionModel } from '../../models/Position.js'
import { UserModel } from '../../models/User.js'
import { VoteModel } from '../../models/Vote.js'

export async function dashboard(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const election = await ElectionModel.findOne({ status: 'open' }).sort({ createdAt: -1 })
  const [totalMembers, totalCandidates, totalPositions, votesCast] = await Promise.all([
    UserModel.countDocuments({ role: 'member' }),
    CandidateModel.countDocuments(election ? { electionId: election._id } : {}),
    PositionModel.countDocuments(election ? { electionId: election._id } : {}),
    VoteModel.countDocuments(election ? { electionId: election._id } : {}),
  ])

  return res.status(200).json({
    stats: {
      totalMembers,
      totalCandidates,
      totalPositions,
      votesCast,
      voterTurnout: totalMembers ? Math.round((votesCast / totalMembers) * 100) : 0,
      electionStatus: election?.status ?? 'none',
    },
  })
}
