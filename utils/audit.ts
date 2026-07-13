import { AuditLogModel } from '../models/AuditLog.js'
import { UserModel } from '../models/User.js'
import { sendElectionOpenedEmail, sendResultsPublishedEmail } from './email.js'

export async function notifyMembers(electionTitle: string, kind: 'opened' | 'closed') {
  try {
    const members = await UserModel.find({ role: 'member', status: 'active' }).lean()
    await Promise.allSettled(
      members.map((m) =>
        kind === 'opened'
          ? sendElectionOpenedEmail(m.email, m.fullname, electionTitle)
          : sendResultsPublishedEmail(m.email, m.fullname, electionTitle),
      ),
    )
  } catch (err) { console.error('Failed to notify members:', err) }
}

export async function logAudit(userId: string, role: string, action: string, resource: string, resourceId = '', details = '') {
  try {
    await AuditLogModel.create({ userId, role, action, resource, resourceId, details })
  } catch (err) { console.error('Failed to log audit:', err) }
}
