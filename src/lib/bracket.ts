export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export type MonthIndex = number // 0-11

export interface Slot {
  /** Data URL of the cover image for this slot, or null if not decided yet. */
  image: string | null
  /** Human label, e.g. "January" for a leaf slot, or a placeholder for a still-pending one. */
  label: string
  /** True if this slot is still waiting on an earlier match to be decided. */
  pending: boolean
}

export interface Match {
  id: string
  round: number
  a: Slot
  b: Slot
  /** Which side won: 0 for a, 1 for b. Undefined if undecided. */
  pick?: 0 | 1
}

export interface BracketResult {
  /** Rounds of matches, in ascending order. Round 1 is the 6 month-pair
   * matchups. Rounds 2-4 resolve each 6-month half down to a half-champion
   * using a "loser plays the next contender" ladder (see buildHalf below).
   * Round 5 is the final between the two half-champions. */
  rounds: Match[][]
  /** The final slot once every match has been decided, otherwise null. */
  champion: Slot | null
}

/**
 * Builds the full 12-month bracket.
 *
 * The 12 months split into two 6-month halves (Jan-Jun, Jul-Dec). Within a
 * half, the 3 pair-winners are reduced to one half-champion with a ladder:
 * winner1 vs winner2 (round 2); the loser of that plays winner3 (round 3);
 * then the round-2 winner plays the round-3 winner to decide the half
 * champion (round 4). The two half-champions meet in the final (round 5).
 */
export function buildBracket(
  images: Partial<Record<MonthIndex, string>>,
  picks: Record<string, 0 | 1>,
): BracketResult {
  const leaves: Slot[] = MONTHS.map((name, i) => ({
    image: images[i] ?? null,
    label: name,
    pending: false,
  }))

  function play(id: string, round: number, a: Slot, b: Slot) {
    const canDecide = !!a.image && !a.pending && !!b.image && !b.pending
    const pick = canDecide ? picks[id] : undefined
    const match: Match = { id, round, a, b, pick }

    if (pick === undefined) {
      const pendingSlot: Slot = { image: null, label: `${a.label} / ${b.label}`, pending: true }
      return { match, winner: pendingSlot, loser: pendingSlot }
    }

    const winner = pick === 0 ? a : b
    const loser = pick === 0 ? b : a
    return { match, winner, loser }
  }

  const rounds: Match[][] = [[], [], [], [], []]

  const round1Winners: Slot[] = []
  for (let i = 0; i < 6; i++) {
    const { match, winner } = play(`1-${i}`, 1, leaves[i * 2], leaves[i * 2 + 1])
    rounds[0].push(match)
    round1Winners.push(winner)
  }

  function buildHalf(pairOffset: number, halfIndex: number): Slot {
    const w0 = round1Winners[pairOffset]
    const w1 = round1Winners[pairOffset + 1]
    const w2 = round1Winners[pairOffset + 2]

    const { match: m2, winner: r2Winner, loser: r2Loser } = play(`2-${halfIndex}`, 2, w0, w1)
    rounds[1].push(m2)

    const { match: m3, winner: r3Winner } = play(`3-${halfIndex}`, 3, r2Loser, w2)
    rounds[2].push(m3)

    const { match: m4, winner: halfChampion } = play(`4-${halfIndex}`, 4, r2Winner, r3Winner)
    rounds[3].push(m4)

    return halfChampion
  }

  const champA = buildHalf(0, 0)
  const champB = buildHalf(3, 1)

  const { match: finalMatch, winner: champion } = play('5-0', 5, champA, champB)
  rounds[4].push(finalMatch)

  return {
    rounds,
    champion: champion.image && !champion.pending ? champion : null,
  }
}
