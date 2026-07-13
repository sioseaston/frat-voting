export type Role = 'admin' | 'member'
export type UserStatus = 'active' | 'inactive'
export type ElectionStatus = 'draft' | 'open' | 'closed'

export interface User {
  _id: string
  membershipNumber: string
  fullname: string
  email: string
  role: Role
  status: UserStatus
  hasVoted: boolean
  createdAt?: string
}

export interface Election {
  _id: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: ElectionStatus
  showResultsBeforeEnd?: boolean
  createdAt?: string
}

export interface Position {
  _id: string
  electionId: string
  name: string
  order: number
}

export interface Candidate {
  _id: string
  electionId: string
  positionId: string
  fullname: string
  photo: string
  platform: string
  biography: string
}

export interface BallotChoice {
  positionId: string
  candidateId: string
}

export interface DashboardStats {
  totalMembers: number
  totalCandidates: number
  totalPositions: number
  votesCast: number
  voterTurnout: number
  electionStatus: ElectionStatus | 'none'
}

export interface ResultsCandidate {
  candidateId: string
  fullname: string
  photo: string
  votes: number
  percentage: number
  isWinner: boolean
}

export interface ResultsPosition {
  positionId: string
  name: string
  order: number
  totalVotes: number
  candidates: ResultsCandidate[]
}

export interface ResultsPayload {
  election: Election | null
  totalVotes: number
  voterTurnout: number
  results: ResultsPosition[]
}
