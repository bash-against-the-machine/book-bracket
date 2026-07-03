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
  /** Human label, e.g. "January" for a leaf, or "January/February" for a derived slot. */
  label: string
  /** True if this slot is still waiting on an earlier match to be decided. */
  pending: boolean
}

export interface Match {
  id: string
  round: number
  indexInRound: number
  a: Slot
  b: Slot | null // null means "a" advances on a bye
  /** Which side won: 0 for a, 1 for b. Undefined if undecided. */
  pick?: 0 | 1
}

export interface BracketResult {
  /** Rounds of matches, in ascending order (round 1 = the 6 month-pair matchups). */
  rounds: Match[][]
  /** The final slot once every match has been decided, otherwise null. */
  champion: Slot | null
}

/**
 * Builds the full elimination bracket from the 12 month cover images.
 * Adjacent months are paired (Jan/Feb, Mar/Apr, ...), winners are paired
 * with winners, and so on until a single champion remains. Since 12 isn't
 * a power of two, one round ends up with an odd slot out that gets a bye.
 */
export function buildBracket(
  images: Partial<Record<MonthIndex, string>>,
  picks: Record<string, 0 | 1>,
): BracketResult {
  let current: Slot[] = MONTHS.map((name, i) => ({
    image: images[i] ?? null,
    label: name,
    pending: false,
  }))

  const rounds: Match[][] = []
  let round = 1

  while (current.length > 1) {
    const matches: Match[] = []
    const next: Slot[] = []

    for (let i = 0; i < current.length; i += 2) {
      const a = current[i]
      const b = i + 1 < current.length ? current[i + 1] : null
      const indexInRound = i / 2
      const id = `${round}-${indexInRound}`

      if (!b) {
        // Odd one out: advances automatically, no match to play.
        matches.push({ id, round, indexInRound, a, b: null })
        next.push(a)
        continue
      }

      const canDecide = !!a.image && !a.pending && !!b.image && !b.pending
      const pick = canDecide ? picks[id] : undefined

      matches.push({ id, round, indexInRound, a, b, pick })

      if (pick === undefined) {
        next.push({ image: null, label: `${a.label} / ${b.label}`, pending: true })
      } else {
        const winner = pick === 0 ? a : b
        next.push({ ...winner, label: `${a.label} / ${b.label}` })
      }
    }

    rounds.push(matches)
    current = next
    round++
  }

  const champion = current[0] ?? null
  return {
    rounds,
    champion: champion && champion.image && !champion.pending ? champion : null,
  }
}
