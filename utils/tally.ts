export interface CandidateBrief {
  _id: string
  fullname: string
  photo: string
}

export interface Ballot {
  votes: { positionId: string; candidateId: string }[]
}

export interface CandidateResult {
  candidateId: string
  fullname: string
  photo: string
  votes: number
  percentage: number
  isWinner: boolean
}

export interface TallyResult {
  totalVotes: number
  winner: string | null
  candidates: CandidateResult[]
}

export function computeResults(
  candidates: CandidateBrief[],
  ballots: Ballot[],
  positionId: string,
): TallyResult {
  const totalVotes = ballots.length
  const voteCount = new Map<string, number>()
  for (const c of candidates) voteCount.set(c._id, 0)

  for (const ballot of ballots) {
    const choice = ballot.votes.find((v) => v.positionId === positionId)
    if (choice && voteCount.has(choice.candidateId)) {
      voteCount.set(choice.candidateId, (voteCount.get(choice.candidateId) ?? 0) + 1)
    }
  }

  const sorted = [...voteCount.entries()].sort((a, b) => b[1] - a[1])
  const maxVotes = sorted[0]?.[1] ?? 0
  const winnerId = maxVotes > 0 ? sorted[0][0] : null

  return {
    totalVotes,
    winner: winnerId,
    candidates: candidates.map((c) => {
      const v = voteCount.get(c._id) ?? 0
      return {
        candidateId: c._id,
        fullname: c.fullname,
        photo: c.photo,
        votes: v,
        percentage: totalVotes ? Math.round((v / totalVotes) * 100) : 0,
        isWinner: c._id === winnerId,
      }
    }),
  }
}
