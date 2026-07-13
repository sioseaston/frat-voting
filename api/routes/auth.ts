import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, clearAuthCookie, setAuthCookie, signToken } from '../../middleware/auth.js'
import { UserModel } from '../../models/User.js'
import { PasswordResetTokenModel } from '../../models/PasswordResetToken.js'
import { sendPasswordResetEmail } from '../../utils/email.js'
import { sendError } from '../../utils/http.js'
import { checkRateLimit, rateLimitKey } from '../../utils/rateLimit.js'

export async function login(req: VercelRequest, res: VercelResponse) {
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown'
  const rlKey = rateLimitKey(ip, 'login')
  if (!checkRateLimit(rlKey, 10, 15 * 60 * 1000)) {
    return sendError(res, 429, 'Too many login attempts. Try again later.')
  }

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

export function logout(_req: VercelRequest, res: VercelResponse) {
  clearAuthCookie(res)
  return res.status(200).json({ ok: true })
}

export async function me(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res)
  if (!auth) return
  const user = await UserModel.findById(auth.id)
  return user ? res.status(200).json({ user }) : sendError(res, 404, 'User not found')
}

export async function forgotPassword(req: VercelRequest, res: VercelResponse) {
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown'
  const rlKey = rateLimitKey(ip, 'forgot-password')
  if (!checkRateLimit(rlKey, 5, 15 * 60 * 1000)) {
    return sendError(res, 429, 'Too many requests. Try again later.')
  }

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

export async function resetPassword(req: VercelRequest, res: VercelResponse) {
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
