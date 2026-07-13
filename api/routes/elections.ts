import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { ElectionModel } from '../../models/Election.js'
import { logAudit, notifyMembers } from '../../utils/audit.js'
import { sendError } from '../../utils/http.js'

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

export async function list(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res)
  if (!auth) return
  return res.status(200).json({ elections: await ElectionModel.find().sort({ createdAt: -1 }) })
}

export async function create(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const parsed = electionSchema.required().safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Invalid election payload')

  if (parsed.data.status === 'open') {
    await ElectionModel.updateMany({ status: 'open' }, { $set: { status: 'closed' } })
  }
  const election = await ElectionModel.create(parsed.data)
  logAudit(auth.id, auth.role, 'create', 'election', election._id.toString(), `Created election ${election.title}`)
  if (parsed.data.status === 'open') notifyMembers(election.title, 'opened')
  return res.status(201).json({ election })
}

export async function remove(req: VercelRequest, res: VercelResponse, electionId: string) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  await ElectionModel.findByIdAndDelete(electionId)
  logAudit(auth.id, auth.role, 'delete', 'election', electionId, 'Deleted election')
  return res.status(200).json({ ok: true })
}

export async function update(req: VercelRequest, res: VercelResponse, electionId: string) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const parsed = electionSchema.safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Invalid election payload')

  const wasOpen = parsed.data.status === 'open'
  const wasClosed = parsed.data.status === 'closed'
  if (wasOpen) {
    await ElectionModel.updateMany({ _id: { $ne: electionId }, status: 'open' }, { $set: { status: 'closed' } })
  }
  const election = await ElectionModel.findByIdAndUpdate(electionId, parsed.data, { new: true })
  if (election) {
    logAudit(auth.id, auth.role, 'update', 'election', electionId, `Updated election ${election.title}`)
    if (wasOpen) notifyMembers(election.title, 'opened')
    if (wasClosed) notifyMembers(election.title, 'closed')
  }
  return election ? res.status(200).json({ election }) : sendError(res, 404, 'Election not found')
}
