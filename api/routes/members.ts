import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../middleware/auth.js'
import { UserModel } from '../../models/User.js'
import { logAudit } from '../../utils/audit.js'
import { sendError } from '../../utils/http.js'

const memberSchema = z.object({
  membershipNumber: z.string().min(2),
  fullname: z.string().min(3),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.enum(['admin', 'member']).default('member'),
  status: z.enum(['active', 'inactive']).default('active'),
})

export async function list(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return
  return res.status(200).json({ members: await UserModel.find().sort({ createdAt: -1 }) })
}

export async function create(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const parsed = memberSchema.extend({ password: z.string().min(6) }).safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Invalid member payload')

  const password = await bcrypt.hash(parsed.data.password, 12)
  const member = await UserModel.create({ ...parsed.data, email: parsed.data.email.toLowerCase(), password })
  logAudit(auth.id, auth.role, 'create', 'member', member._id.toString(), `Created member ${member.fullname}`)
  return res.status(201).json({ member })
}

export async function remove(req: VercelRequest, res: VercelResponse, memberId: string) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  await UserModel.findByIdAndDelete(memberId)
  logAudit(auth.id, auth.role, 'delete', 'member', memberId, 'Deleted member')
  return res.status(200).json({ ok: true })
}

export async function update(req: VercelRequest, res: VercelResponse, memberId: string) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  const parsed = memberSchema.partial().safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Invalid member payload')

  const update = { ...parsed.data } as Record<string, unknown>
  if (update.email) update.email = (update.email as string).toLowerCase()
  if (update.password) update.password = await bcrypt.hash(update.password as string, 12)
  else delete update.password

  const member = await UserModel.findByIdAndUpdate(memberId, update, { new: true })
  if (member) logAudit(auth.id, auth.role, 'update', 'member', memberId, `Updated member ${member.fullname}`)
  return member ? res.status(200).json({ member }) : sendError(res, 404, 'Member not found')
}

export async function exportCsv(req: VercelRequest, res: VercelResponse) {
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

export async function importCsv(req: VercelRequest, res: VercelResponse) {
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
  logAudit(auth.id, auth.role, 'import', 'member', '', `Imported ${result.length} members`)
  return res.status(201).json({ imported: result.length })
}
