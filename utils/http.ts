import type { VercelRequest, VercelResponse } from '@vercel/node'

export function sendError(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ error })
}

export function requireMethod(req: VercelRequest, res: VercelResponse, methods: string[]) {
  if (!req.method || !methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '))
    sendError(res, 405, 'Method not allowed')
    return false
  }
  return true
}

export function idFromRequest(req: VercelRequest) {
  const value = req.query.id
  return Array.isArray(value) ? value[0] : value
}
