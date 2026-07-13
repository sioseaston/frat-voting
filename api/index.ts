import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, clearAuthCookie, requireRole, setAuthCookie, signToken } from '../middleware/auth.js'
import { CandidateModel } from '../models/Candidate.js'
import { ElectionModel } from '../models/Election.js'
import { PositionModel } from '../models/Position.js'
import { UserModel } from '../models/User.js'
import crypto from 'crypto'
import { AuditLogModel } from '../models/AuditLog.js'
import { PasswordResetTokenModel } from '../models/PasswordResetToken.js'
import { VoteModel } from '../models/Vote.js'
import { connectDb } from '../utils/db.js'
import { sendElectionOpenedEmail, sendPasswordResetEmail, sendResultsPublishedEmail } from '../utils/email.js'
import { sendError } from '../utils/http.js'

async function notifyMembers(electionTitle: string, kind: 'opened' | 'closed') {
  try {
    const members = await UserModel.find({ role: 'member', status: 'active' }).lean()
    await Promise.allSettled(
      members.map((m) =>
        kind === 'opened'
          ? sendElectionOpenedEmail(m.email, m.fullname, electionTitle)
          : sendResultsPublishedEmail(m.email, m.fullname, electionTitle),
      ),
    )
  } catch { /* silent */ }
}

async function logAudit(userId: string, role: string, action: string, resource: string, resourceId = '', details = '') {
  try {
    await AuditLogModel.create({ userId, role, action, resource, resourceId, details })
  } catch { /* silent */ }
}

function routePath(req: VercelRequest) {
  const routed = req.query.path
  if (Array.isArray(routed)) return routed.join('/')
  if (routed) return routed
  return new URL(req.url ?? '/', 'http://localhost').pathname.replace(/^\/api\/?/, '')
}

const memberSchema = z.object({
  membershipNumber: z.string().min(2),
  fullname: z.string().min(3),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.enum(['admin', 'member']).default('member'),
  status: z.enum(['active', 'inactive']).default('active'),
})

const electionSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  status: z.enum(['draft', 'open', 'closed']).optional(),
  showResultsBeforeEnd: z.boolean().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate)
  }
  return true
}, { message: 'End date must be after start date', path: ['endDate'] })

const positionSchema = z.object({
  electionId: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  order: z.number().min(1).optional(),
})

const candidateSchema = z.object({
  electionId: z.string().min(1).optional(),
  positionId: z.string().min(1).optional(),
  fullname: z.string().min(3).optional(),
  photo: z.string().optional(),
  platform: z.string().min(5).optional(),
  biography: z.string().min(5).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = routePath(req)
    const method = req.method ?? 'GET'
    await connectDb()

    if (path === 'auth/login' && method === 'POST') {
      const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body)
      if (!parsed.success) return sendError(res, 400, 'Invalid login payload')
      const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() })
      if (!user) return sendError(res, 401, 'Invalid credentials')
      if (user.status !== 'active') return sendError(res, 401, 'Account is inactive. Please contact your Chapter Officer.')
      const valid = await bcrypt.compare(parsed.data.password, user.password)
      if (!valid) return sendError(res, 401, 'Invalid credentials')
      const token = signToken(user)
      setAuthCookie(res, token)
      return res.status(200).json({ token, user })
    }

    if (path === 'auth/logout' && method === 'POST') {
      clearAuthCookie(res)
      return res.status(200).json({ ok: true })
    }

    if (path === 'auth/me' && method === 'GET') {
      const auth = await authenticate(req, res)
      if (!auth) return
      const user = await UserModel.findById(auth.id)
      return user ? res.status(200).json({ user }) : sendError(res, 404, 'User not found')
    }

    if (path === 'auth/forgot-password' && method === 'POST') {
      const parsed = z.object({ email: z.string().email() }).safeParse(req.body)
      if (!parsed.success) return sendError(res, 400, 'Invalid email')
      const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase(), status: 'active' })
      if (user) {
        const raw = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(raw).digest('hex')
        await PasswordResetTokenModel.create({
          userId: user._id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        })
        await sendPasswordResetEmail(user.email, user.fullname, raw)
      }
      return res.status(200).json({ ok: true })
    }

    if (path === 'auth/reset-password' && method === 'POST') {
      const parsed = z.object({ token: z.string().min(1), password: z.string().min(6) }).safeParse(req.body)
      if (!parsed.success) return sendError(res, 400, 'Invalid token or password')
      const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex')
      const doc = await PasswordResetTokenModel.findOne({
        tokenHash,
        used: false,
        expiresAt: { $gt: new Date() },
      })
      if (!doc) return sendError(res, 400, 'Invalid or expired token')
      const password = await bcrypt.hash(parsed.data.password, 12)
      await Promise.all([
        UserModel.findByIdAndUpdate(doc.userId, { password }),
        PasswordResetTokenModel.findByIdAndUpdate(doc._id, { used: true }),
      ])
      return res.status(200).json({ ok: true })
    }

    if (path === 'dashboard' && method === 'GET') {
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

    if (path === 'members') {
      const auth = await requireRole(req, res, ['admin'])
      if (!auth) return
      if (method === 'GET') return res.status(200).json({ members: await UserModel.find().sort({ createdAt: -1 }) })
      if (method === 'POST') {
        const parsed = memberSchema.extend({ password: z.string().min(6) }).safeParse(req.body)
        if (!parsed.success) return sendError(res, 400, 'Invalid member payload')
        const password = await bcrypt.hash(parsed.data.password, 12)
        const member = await UserModel.create({ ...parsed.data, email: parsed.data.email.toLowerCase(), password })
        await logAudit(auth.id, auth.role, 'create', 'member', member._id.toString(), `Created member ${member.fullname}`)
        return res.status(201).json({ member })
      }
    }

    const memberId = path.match(/^members\/([^/]+)$/)?.[1]
    if (memberId) {
      const auth = await requireRole(req, res, ['admin'])
      if (!auth) return
      if (method === 'DELETE') {
        await UserModel.findByIdAndDelete(memberId)
        await logAudit(auth.id, auth.role, 'delete', 'member', memberId, 'Deleted member')
        return res.status(200).json({ ok: true })
      }
      if (method === 'PUT') {
        const parsed = memberSchema.partial().safeParse(req.body)
        if (!parsed.success) return sendError(res, 400, 'Invalid member payload')
        const update = { ...parsed.data }
        if (update.email) update.email = update.email.toLowerCase()
        if (update.password) update.password = await bcrypt.hash(update.password, 12)
        else delete update.password
        const member = await UserModel.findByIdAndUpdate(memberId, update, { new: true })
        if (member) await logAudit(auth.id, auth.role, 'update', 'member', memberId, `Updated member ${member.fullname}`)
        return member ? res.status(200).json({ member }) : sendError(res, 404, 'Member not found')
      }
    }

    if (path === 'members/export' && method === 'GET') {
      const auth = await requireRole(req, res, ['admin'])
      if (!auth) return
      const members = await UserModel.find().sort({ createdAt: -1 }).lean()
      const esc = (v: unknown) => {
        const s = String(v ?? '')
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }
      const header = 'membershipNumber,fullname,email,role,status,hasVoted'
      const rows = members.map((m) =>
        [m.membershipNumber, m.fullname, m.email, m.role, m.status, m.hasVoted].map(esc).join(','),
      )
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="members.csv"')
      return res.status(200).send([header, ...rows].join('\n'))
    }

    if (path === 'members/import' && method === 'POST') {
      const auth = await requireRole(req, res, ['admin'])
      if (!auth) return
      const parsed = z
        .array(
          z.object({
            membershipNumber: z.string().min(2),
            fullname: z.string().min(3),
            email: z.string().email(),
            role: z.enum(['admin', 'member']).default('member'),
            status: z.enum(['active', 'inactive']).default('active'),
          }),
        )
        .safeParse(req.body)
      if (!parsed.success) return sendError(res, 400, 'Invalid member data')
      const defaultPassword = await bcrypt.hash('ChangeMe123!', 12)
      const members = parsed.data.map((m) => ({
        ...m,
        email: m.email.toLowerCase(),
        password: defaultPassword,
      }))
      const result = await UserModel.insertMany(members, { ordered: false })
      await logAudit(auth.id, auth.role, 'import', 'member', '', `Imported ${result.length} members`)
      return res.status(201).json({ imported: result.length })
    }

    if (path === 'elections') {
      const auth = method === 'GET' ? await authenticate(req, res) : await requireRole(req, res, ['admin'])
      if (!auth) return
      if (method === 'GET') return res.status(200).json({ elections: await ElectionModel.find().sort({ createdAt: -1 }) })
      if (method === 'POST') {
        const parsed = electionSchema.required().safeParse(req.body)
        if (!parsed.success) return sendError(res, 400, 'Invalid election payload')
        if (parsed.data.status === 'open') {
          await ElectionModel.updateMany({ status: 'open' }, { $set: { status: 'closed' } })
        }
        const election = await ElectionModel.create(parsed.data)
        await logAudit(auth.id, auth.role, 'create', 'election', election._id.toString(), `Created election ${election.title}`)
        if (parsed.data.status === 'open') await notifyMembers(election.title, 'opened')
        return res.status(201).json({ election })
      }
    }

    const electionId = path.match(/^elections\/([^/]+)$/)?.[1]
    if (electionId) {
      const auth = await requireRole(req, res, ['admin'])
      if (!auth) return
      if (method === 'DELETE') {
        await ElectionModel.findByIdAndDelete(electionId)
        await logAudit(auth.id, auth.role, 'delete', 'election', electionId, 'Deleted election')
        return res.status(200).json({ ok: true })
      }
      if (method === 'PUT') {
        const parsed = electionSchema.safeParse(req.body)
        if (!parsed.success) return sendError(res, 400, 'Invalid election payload')
        const wasOpen = parsed.data.status === 'open'
        const wasClosed = parsed.data.status === 'closed'
        if (wasOpen) {
          await ElectionModel.updateMany({ _id: { $ne: electionId }, status: 'open' }, { $set: { status: 'closed' } })
        }
        const election = await ElectionModel.findByIdAndUpdate(electionId, parsed.data, { new: true })
        if (election) {
          await logAudit(auth.id, auth.role, 'update', 'election', electionId, `Updated election ${election.title}`)
          if (wasOpen) await notifyMembers(election.title, 'opened')
          if (wasClosed) await notifyMembers(election.title, 'closed')
        }
        return election ? res.status(200).json({ election }) : sendError(res, 404, 'Election not found')
      }
    }

    if (path === 'positions') {
      const auth = method === 'GET' ? await authenticate(req, res) : await requireRole(req, res, ['admin'])
      if (!auth) return
      if (method === 'GET') {
        const query = req.query.electionId ? { electionId: req.query.electionId } : {}
        return res.status(200).json({ positions: await PositionModel.find(query).sort({ order: 1 }) })
      }
      if (method === 'POST') {
        const parsed = positionSchema.required().safeParse(req.body)
        if (!parsed.success) return sendError(res, 400, 'Invalid position payload')
        const position = await PositionModel.create(parsed.data)
        await logAudit(auth.id, auth.role, 'create', 'position', position._id.toString(), `Created position ${position.name}`)
        return res.status(201).json({ position })
      }
    }

    const positionId = path.match(/^positions\/([^/]+)$/)?.[1]
    if (positionId) {
      const auth = await requireRole(req, res, ['admin'])
      if (!auth) return
      if (method === 'DELETE') {
        await PositionModel.findByIdAndDelete(positionId)
        await logAudit(auth.id, auth.role, 'delete', 'position', positionId, 'Deleted position')
        return res.status(200).json({ ok: true })
      }
      if (method === 'PUT') {
        const parsed = positionSchema.partial().safeParse(req.body)
        if (!parsed.success) return sendError(res, 400, 'Invalid position payload')
        const position = await PositionModel.findByIdAndUpdate(positionId, parsed.data, { new: true })
        if (position) await logAudit(auth.id, auth.role, 'update', 'position', positionId, `Updated position ${position.name}`)
        return position ? res.status(200).json({ position }) : sendError(res, 404, 'Position not found')
      }
    }

    if (path === 'candidates') {
      const auth = method === 'GET' ? await authenticate(req, res) : await requireRole(req, res, ['admin'])
      if (!auth) return
      if (method === 'GET') {
        const query = req.query.electionId ? { electionId: req.query.electionId } : {}
        return res.status(200).json({ candidates: await CandidateModel.find(query).sort({ fullname: 1 }) })
      }
      if (method === 'POST') {
        const parsed = candidateSchema.required().safeParse(req.body)
        if (!parsed.success) return sendError(res, 400, 'Invalid candidate payload')
        const candidate = await CandidateModel.create(parsed.data)
        await logAudit(auth.id, auth.role, 'create', 'candidate', candidate._id.toString(), `Created candidate ${candidate.fullname}`)
        return res.status(201).json({ candidate })
      }
    }

    const candidateId = path.match(/^candidates\/([^/]+)$/)?.[1]
    if (candidateId) {
      const auth = await requireRole(req, res, ['admin'])
      if (!auth) return
      if (method === 'DELETE') {
        await CandidateModel.findByIdAndDelete(candidateId)
        await logAudit(auth.id, auth.role, 'delete', 'candidate', candidateId, 'Deleted candidate')
        return res.status(200).json({ ok: true })
      }
      if (method === 'PUT') {
        const parsed = candidateSchema.partial().safeParse(req.body)
        if (!parsed.success) return sendError(res, 400, 'Invalid candidate payload')
        const candidate = await CandidateModel.findByIdAndUpdate(candidateId, parsed.data, { new: true })
        if (candidate) await logAudit(auth.id, auth.role, 'update', 'candidate', candidateId, `Updated candidate ${candidate.fullname}`)
        return candidate ? res.status(200).json({ candidate }) : sendError(res, 404, 'Candidate not found')
      }
    }

    if (path === 'audit-logs' && method === 'GET') {
      const auth = await requireRole(req, res, ['admin'])
      if (!auth) return
      const logs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(200).populate('userId', 'fullname email').lean()
      return res.status(200).json({ logs })
    }

    if (path === 'vote' && method === 'POST') return submitVote(req, res)
    if (path === 'results' && method === 'GET') return getResults(req, res)

    return sendError(res, 404, 'API route not found')
  } catch (error) {
    console.error('API error:', error)
    return sendError(res, 500, error instanceof Error ? error.message : 'Unexpected API error')
  }
}

async function submitVote(req: VercelRequest, res: VercelResponse) {
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
    await logAudit(auth.id, auth.role, 'vote', 'election', parsed.data.electionId, 'Cast ballot')
    const remaining = await UserModel.countDocuments({ role: 'member', status: 'active', hasVoted: false })
    if (remaining === 0) {
      await ElectionModel.findByIdAndUpdate(parsed.data.electionId, { status: 'closed' })
      const election = await ElectionModel.findById(parsed.data.electionId)
      if (election) {
        await logAudit('system', 'system', 'update', 'election', election._id.toString(), `Auto-closed — all members voted`)
        await notifyMembers(election.title, 'closed')
      }
    }
    return res.status(201).json({ ok: true })
  } finally {
    await session.endSession()
  }
}

function computeResults(
  candidates: { _id: string; fullname: string; photo: string }[],
  ballots: { votes: { positionId: string; candidateId: string }[] }[],
  positionId: string,
) {
  const totalVotes = ballots.length
  const voteCount = new Map<string, number>()
  for (const c of candidates) voteCount.set(c._id, 0)

  for (const ballot of ballots) {
    const choice = ballot.votes.find((v) => v.positionId === positionId)
    if (choice && voteCount.has(choice.candidateId)) {
      voteCount.set(choice.candidateId, (voteCount.get(choice.candidateId) ?? 0) + 1)
    }
  }

  const sorted = [...voteCount.entries()].sort((a, b) => b[1] - a[1])
  const maxVotes = sorted[0]?.[1] ?? 0
  const winnerId = maxVotes > 0 ? sorted[0][0] : null

  return {
    totalVotes,
    winner: winnerId,
    candidates: candidates.map((c) => {
      const v = voteCount.get(c._id) ?? 0
      return {
        candidateId: c._id,
        fullname: c.fullname,
        photo: c.photo,
        votes: v,
        percentage: totalVotes ? Math.round((v / totalVotes) * 100) : 0,
        isWinner: c._id === winnerId,
      }
    }),
  }
}

async function getResults(req: VercelRequest, res: VercelResponse) {
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
