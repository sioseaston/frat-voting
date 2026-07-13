import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { PositionModel } from '../../models/Position.js'
import { logAudit } from '../../utils/audit.js'
import { sendError } from '../../utils/http.js'

const positionSchema = z.object({
  electionId: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  order: z.number().min(1).optional(),
})

export async function list(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res)
  if (!auth) return

  const query = req.query.electionId ? { electionId: req.query.electionId } : {}
  return res.status(200).json({ positions: await PositionModel.find(query).sort({ order: 1 }) })
}

export async function create(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const parsed = positionSchema.required().safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Invalid position payload')

  const position = await PositionModel.create(parsed.data)
  logAudit(auth.id, auth.role, 'create', 'position', position._id.toString(), `Created position ${position.name}`)
  return res.status(201).json({ position })
}

export async function remove(req: VercelRequest, res: VercelResponse, positionId: string) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  await PositionModel.findByIdAndDelete(positionId)
  logAudit(auth.id, auth.role, 'delete', 'position', positionId, 'Deleted position')
  return res.status(200).json({ ok: true })
}

export async function update(req: VercelRequest, res: VercelResponse, positionId: string) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const parsed = positionSchema.partial().safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Invalid position payload')

  const position = await PositionModel.findByIdAndUpdate(positionId, parsed.data, { new: true })
  if (position) logAudit(auth.id, auth.role, 'update', 'position', positionId, `Updated position ${position.name}`)
  return position ? res.status(200).json({ position }) : sendError(res, 404, 'Position not found')
}
