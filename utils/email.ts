import { Resend } from 'resend'

const RESEND_KEY = process.env.RESEND_API_KEY
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const FROM = process.env.EMAIL_FROM || 'noreply@fraternity-voting.app'

let resend: Resend | null = null
if (RESEND_KEY) resend = new Resend(RESEND_KEY)

export async function sendPasswordResetEmail(email: string, fullname: string, token: string) {
  if (!resend) return
  const link = `${APP_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Fraternity Voting password',
    html: `<p>Hi ${fullname},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, ignore this email.</p>`,
  })
}

export async function sendElectionOpenedEmail(email: string, fullname: string, electionTitle: string) {
  if (!resend) return
  const link = `${APP_URL}/member/vote`
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Voting is open: ${electionTitle}`,
    html: `<p>Hi ${fullname},</p><p>The election <strong>${electionTitle}</strong> is now open. Cast your vote at the link below.</p><p><a href="${link}">${link}</a></p>`,
  })
}

export async function sendResultsPublishedEmail(email: string, fullname: string, electionTitle: string) {
  if (!resend) return
  const link = `${APP_URL}/results`
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Results published: ${electionTitle}`,
    html: `<p>Hi ${fullname},</p><p>The results for <strong>${electionTitle}</strong> are now available.</p><p><a href="${link}">${link}</a></p>`,
  })
}
