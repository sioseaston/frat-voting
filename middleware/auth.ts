import jwt from 'jsonwebtoken'
import { parseCookie } from 'cookie'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { connectDb } from '../utils/db.js'
import { sendError } from '../utils/http.js'
import { UserModel, type UserDocument } from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me'

export interface AuthUser {
  id: string
  role: 'admin' | 'member'
}

export function signToken(user: UserDocument) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: '8h' })
}

export function setAuthCookie(res: VercelResponse, token: string) {
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 8}; Secure`)
}

export function clearAuthCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure')
}

export async function authenticate(req: VercelRequest, res: VercelResponse): Promise<AuthUser | null> {
  const header = req.headers.authorization
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {}
  const token = bearer || cookies.token

  if (!token) {
    sendError(res, 401, 'Authentication required')
    return null
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser
    await connectDb()
    const user = await UserModel.findById(payload.id)
    if (!user || user.status !== 'active') {
      sendError(res, 401, 'Account is inactive or not found')
      return null
    }
    return { id: user._id.toString(), role: user.role }
  } catch {
    sendError(res, 401, 'Invalid or expired token')
    return null
  }
}

export async function requireRole(req: VercelRequest, res: VercelResponse, roles: AuthUser['role'][]) {
  const user = await authenticate(req, res)
  if (!user) return null
  if (!roles.includes(user.role)) {
    sendError(res, 403, 'Insufficient permissions')
    return null
  }
  return user
}
