import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { CandidateModel } from '../../models/Candidate.js'
import { logAudit } from '../../utils/audit.js'
import { sendError } from '../../utils/http.js'

const candidateSchema = z.object({
  electionId: z.string().min(1).optional(),
  positionId: z.string().min(1).optional(),
  fullname: z.string().min(3).optional(),
  photo: z.string().optional(),
  platform: z.string().min(5).optional(),
  biography: z.string().min(5).optional(),
})

export async function list(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res)
  if (!auth) return

  const query = req.query.electionId ? { electionId: req.query.electionId } : {}
  return res.status(200).json({ candidates: await CandidateModel.find(query).sort({ fullname: 1 }) })
}

export async function create(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const parsed = candidateSchema.required().safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Invalid candidate payload')

  const candidate = await CandidateModel.create(parsed.data)
  logAudit(auth.id, auth.role, 'create', 'candidate', candidate._id.toString(), `Created candidate ${candidate.fullname}`)
  return res.status(201).json({ candidate })
}

export async function remove(req: VercelRequest, res: VercelResponse, candidateId: string) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  await CandidateModel.findByIdAndDelete(candidateId)
  logAudit(auth.id, auth.role, 'delete', 'candidate', candidateId, 'Deleted candidate')
  return res.status(200).json({ ok: true })
}

export async function update(req: VercelRequest, res: VercelResponse, candidateId: string) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const parsed = candidateSchema.partial().safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Invalid candidate payload')

  const candidate = await CandidateModel.findByIdAndUpdate(candidateId, parsed.data, { new: true })
  if (candidate) logAudit(auth.id, auth.role, 'update', 'candidate', candidateId, `Updated candidate ${candidate.fullname}`)
  return candidate ? res.status(200).json({ candidate }) : sendError(res, 404, 'Candidate not found')
}
