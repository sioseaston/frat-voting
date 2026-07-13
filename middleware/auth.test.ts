import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { signToken, authenticate, requireRole, setAuthCookie, clearAuthCookie } from './auth'

vi.mock('../utils/db', () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}))

const mockUser = {
  _id: { toString: () => 'user123' },
  role: 'member' as const,
  status: 'active',
}

vi.mock('../models/User', () => ({
  UserModel: {
    findById: vi.fn(),
  },
}))

import { UserModel } from '../models/User'

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  } as any
}

function mockRes() {
  const headers: Record<string, string> = {}
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn((key: string, val: string) => {
      headers[key] = val
    }),
    getHeader: (key: string) => headers[key],
  } as any
}

describe('signToken', () => {
  it('returns a valid JWT string', () => {
    const token = signToken(mockUser as any)
    expect(typeof token).toBe('string')
    const decoded = jwt.decode(token) as any
    expect(decoded.id).toBe('user123')
    expect(decoded.role).toBe('member')
  })

  it('expires in 8 hours', () => {
    const token = signToken(mockUser as any)
    const decoded = jwt.decode(token) as any
    const eightHours = 8 * 60 * 60
    expect(decoded.exp - decoded.iat).toBe(eightHours)
  })
})

describe('setAuthCookie and clearAuthCookie', () => {
  it('setAuthCookie sets HttpOnly cookie with token', () => {
    const res = mockRes()
    setAuthCookie(res, 'test-token')
    const cookie = res.getHeader('Set-Cookie') as string
    expect(cookie).toContain('token=test-token')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('Max-Age=' + 8 * 60 * 60)
  })

  it('clearAuthCookie sets empty cookie with Max-Age=0', () => {
    const res = mockRes()
    clearAuthCookie(res)
    const cookie = res.getHeader('Set-Cookie') as string
    expect(cookie).toContain('token=')
    expect(cookie).toContain('Max-Age=0')
  })
})

describe('authenticate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
  })

  it('returns null and sends 401 when no token is provided', async () => {
    const req = mockReq()
    const res = mockRes()
    const result = await authenticate(req, res)
    expect(result).toBeNull()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
  })

  it('returns user when valid Bearer token is provided', async () => {
    const token = jwt.sign({ id: 'user123', role: 'member' }, 'test-secret')
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } })
    const res = mockRes()
    ;(UserModel.findById as any).mockResolvedValue(mockUser)
    const result = await authenticate(req, res)
    expect(result).toEqual({ id: 'user123', role: 'member' })
  })

  it('returns user when valid cookie token is provided', async () => {
    const token = jwt.sign({ id: 'user123', role: 'admin' }, 'test-secret')
    const req = mockReq({ headers: { cookie: `token=${token}` } })
    const res = mockRes()
    ;(UserModel.findById as any).mockResolvedValue({ ...mockUser, role: 'admin' })
    const result = await authenticate(req, res)
    expect(result).toEqual({ id: 'user123', role: 'admin' })
  })

  it('returns null and sends 401 when token is invalid', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer bad-token' } })
    const res = mockRes()
    const result = await authenticate(req, res)
    expect(result).toBeNull()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns null and sends 401 when user is inactive', async () => {
    const token = jwt.sign({ id: 'user123', role: 'member' }, 'test-secret')
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } })
    const res = mockRes()
    ;(UserModel.findById as any).mockResolvedValue({ ...mockUser, status: 'inactive' })
    const result = await authenticate(req, res)
    expect(result).toBeNull()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('prefers Bearer token over cookie', async () => {
    const bearerToken = jwt.sign({ id: 'from-bearer', role: 'member' }, 'test-secret')
    const cookieToken = jwt.sign({ id: 'from-cookie', role: 'admin' }, 'test-secret')
    const req = mockReq({
      headers: {
        authorization: `Bearer ${bearerToken}`,
        cookie: `token=${cookieToken}`,
      },
    })
    const res = mockRes()
    ;(UserModel.findById as any).mockResolvedValue({ ...mockUser, _id: { toString: () => 'from-bearer' } })
    const result = await authenticate(req, res)
    expect(result?.id).toBe('from-bearer')
  })
})

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
  })

  it('returns user when role matches', async () => {
    const token = jwt.sign({ id: 'user123', role: 'admin' }, 'test-secret')
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } })
    const res = mockRes()
    ;(UserModel.findById as any).mockResolvedValue({ ...mockUser, role: 'admin' })
    const result = await requireRole(req, res, ['admin'])
    expect(result).toEqual({ id: 'user123', role: 'admin' })
  })

  it('returns null and sends 403 when role does not match', async () => {
    const token = jwt.sign({ id: 'user123', role: 'member' }, 'test-secret')
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } })
    const res = mockRes()
    ;(UserModel.findById as any).mockResolvedValue(mockUser)
    const result = await requireRole(req, res, ['admin'])
    expect(result).toBeNull()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
