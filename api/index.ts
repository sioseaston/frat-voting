import type { VercelRequest, VercelResponse } from '@vercel/node'
import { connectDb } from '../utils/db.js'
import { sendError } from '../utils/http.js'
import { login, logout, me, forgotPassword, resetPassword } from './routes/auth.js'
import { dashboard } from './routes/dashboard.js'
import { list as listMembers, create as createMember, remove as removeMember, update as updateMember, exportCsv, importCsv } from './routes/members.js'
import { list as listElections, create as createElection, remove as removeElection, update as updateElection } from './routes/elections.js'
import { list as listPositions, create as createPosition, remove as removePosition, update as updatePosition } from './routes/positions.js'
import { list as listCandidates, create as createCandidate, remove as removeCandidate, update as updateCandidate } from './routes/candidates.js'
import { submitVote, getResults } from './routes/votes.js'
import { list as listAuditLogs } from './routes/audit.js'

function routePath(req: VercelRequest) {
  const routed = req.query.path
  if (Array.isArray(routed)) return routed.join('/')
  if (routed) return routed
  return new URL(req.url ?? '/', 'http://localhost').pathname.replace(/^\/api\/?/, '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = routePath(req)
    const method = req.method ?? 'GET'
    await connectDb()

    // Auth routes
    if (path === 'auth/login' && method === 'POST') return login(req, res)
    if (path === 'auth/logout' && method === 'POST') return logout(req, res)
    if (path === 'auth/me' && method === 'GET') return me(req, res)
    if (path === 'auth/forgot-password' && method === 'POST') return forgotPassword(req, res)
    if (path === 'auth/reset-password' && method === 'POST') return resetPassword(req, res)

    // Dashboard
    if (path === 'dashboard' && method === 'GET') return dashboard(req, res)

    // Member routes (static paths BEFORE parameterized)
    if (path === 'members/export' && method === 'GET') return exportCsv(req, res)
    if (path === 'members/import' && method === 'POST') return importCsv(req, res)
    if (path === 'members') {
      if (method === 'GET') return listMembers(req, res)
      if (method === 'POST') return createMember(req, res)
    }
    const memberId = path.match(/^members\/([^/]+)$/)?.[1]
    if (memberId) {
      if (method === 'DELETE') return removeMember(req, res, memberId)
      if (method === 'PUT') return updateMember(req, res, memberId)
    }

    // Election routes
    if (path === 'elections') {
      if (method === 'GET') return listElections(req, res)
      if (method === 'POST') return createElection(req, res)
    }
    const electionId = path.match(/^elections\/([^/]+)$/)?.[1]
    if (electionId) {
      if (method === 'DELETE') return removeElection(req, res, electionId)
      if (method === 'PUT') return updateElection(req, res, electionId)
    }

    // Position routes
    if (path === 'positions') {
      if (method === 'GET') return listPositions(req, res)
      if (method === 'POST') return createPosition(req, res)
    }
    const positionId = path.match(/^positions\/([^/]+)$/)?.[1]
    if (positionId) {
      if (method === 'DELETE') return removePosition(req, res, positionId)
      if (method === 'PUT') return updatePosition(req, res, positionId)
    }

    // Candidate routes
    if (path === 'candidates') {
      if (method === 'GET') return listCandidates(req, res)
      if (method === 'POST') return createCandidate(req, res)
    }
    const candidateId = path.match(/^candidates\/([^/]+)$/)?.[1]
    if (candidateId) {
      if (method === 'DELETE') return removeCandidate(req, res, candidateId)
      if (method === 'PUT') return updateCandidate(req, res, candidateId)
    }

    // Audit logs
    if (path === 'audit-logs' && method === 'GET') return listAuditLogs(req, res)

    // Voting
    if (path === 'vote' && method === 'POST') return submitVote(req, res)
    if (path === 'results' && method === 'GET') return getResults(req, res)

    return sendError(res, 404, 'API route not found')
  } catch (error) {
    console.error('API error:', error)
    return sendError(res, 500, error instanceof Error ? error.message : 'Unexpected API error')
  }
}
