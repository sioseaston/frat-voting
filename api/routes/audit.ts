import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../middleware/auth.js'
import { AuditLogModel } from '../../models/AuditLog.js'

export async function list(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const logs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(200).populate('userId', 'fullname email').lean()
  return res.status(200).json({ logs })
}
