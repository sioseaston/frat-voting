import { describe, it, expect } from 'vitest'
import { computeResults, type CandidateBrief, type Ballot } from './tally'

function makeCandidate(id: string, name: string): CandidateBrief {
  return { _id: id, fullname: name, photo: '' }
}

function makeBallot(positionId: string, candidateId: string): Ballot {
  return { votes: [{ positionId, candidateId }] }
}

describe('computeResults', () => {
  const positionId = 'pos1'

  it('returns empty result when there are no candidates', () => {
    const result = computeResults([], [], positionId)
    expect(result.totalVotes).toBe(0)
    expect(result.winner).toBeNull()
    expect(result.candidates).toEqual([])
  })

  it('returns zero votes when no ballots are cast', () => {
    const candidates = [makeCandidate('c1', 'Alice'), makeCandidate('c2', 'Bob')]
    const result = computeResults(candidates, [], positionId)
    expect(result.totalVotes).toBe(0)
    expect(result.winner).toBeNull()
    expect(result.candidates).toHaveLength(2)
    expect(result.candidates.every((c) => c.votes === 0)).toBe(true)
    expect(result.candidates.every((c) => c.percentage === 0)).toBe(true)
  })

  it('correctly counts votes for a single position', () => {
    const candidates = [makeCandidate('c1', 'Alice'), makeCandidate('c2', 'Bob')]
    const ballots = [makeBallot(positionId, 'c1'), makeBallot(positionId, 'c1'), makeBallot(positionId, 'c2')]
    const result = computeResults(candidates, ballots, positionId)
    expect(result.totalVotes).toBe(3)

    const alice = result.candidates.find((c) => c.candidateId === 'c1')!
    expect(alice.votes).toBe(2)
    expect(alice.percentage).toBe(67)
    expect(alice.isWinner).toBe(true)

    const bob = result.candidates.find((c) => c.candidateId === 'c2')!
    expect(bob.votes).toBe(1)
    expect(bob.percentage).toBe(33)
    expect(bob.isWinner).toBe(false)
  })

  it('marks winner correctly on tie (picks first alphabetically by candidateId)', () => {
    const candidates = [makeCandidate('c1', 'Alice'), makeCandidate('c2', 'Bob')]
    const ballots = [makeBallot(positionId, 'c1'), makeBallot(positionId, 'c2')]
    const result = computeResults(candidates, ballots, positionId)
    expect(result.totalVotes).toBe(2)
    expect(result.winner).toBe('c1')
  })

  it('ignores votes for candidates not in the candidate list', () => {
    const candidates = [makeCandidate('c1', 'Alice')]
    const ballots = [makeBallot(positionId, 'c1'), makeBallot(positionId, 'nonexistent')]
    const result = computeResults(candidates, ballots, positionId)
    expect(result.totalVotes).toBe(2)
    expect(result.candidates[0].votes).toBe(1)
  })

  it('ignores ballots without a matching position vote', () => {
    const candidates = [makeCandidate('c1', 'Alice')]
    const ballots: Ballot[] = [{ votes: [{ positionId: 'other-pos', candidateId: 'c1' }] }]
    const result = computeResults(candidates, ballots, positionId)
    expect(result.totalVotes).toBe(1)
    expect(result.candidates[0].votes).toBe(0)
  })

  it('handles multiple positions correctly (only counts relevant position)', () => {
    const candidates = [makeCandidate('c1', 'Alice'), makeCandidate('c2', 'Bob')]
    const ballots: Ballot[] = [
      { votes: [{ positionId: 'pos1', candidateId: 'c1' }, { positionId: 'pos2', candidateId: 'cX' }] },
      { votes: [{ positionId: 'pos1', candidateId: 'c2' }, { positionId: 'pos2', candidateId: 'cY' }] },
      { votes: [{ positionId: 'pos1', candidateId: 'c1' }] },
    ]
    const result = computeResults(candidates, ballots, 'pos1')
    expect(result.totalVotes).toBe(3)
    expect(result.candidates.find((c) => c.candidateId === 'c1')!.votes).toBe(2)
    expect(result.candidates.find((c) => c.candidateId === 'c2')!.votes).toBe(1)
  })
})
