export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export type MonthIndex = number // 0-11

export type Picks = Record<string, 0 | 1>

export interface Slot {
  /** Data URL of the cover image occupying this spot, or null if undecided. */
  image: string | null
  /** Month abbreviation once a book occupies the spot, e.g. "Jan". */
  label: string
  /** True if this spot is still waiting on an earlier match to be decided. */
  pending: boolean
}

export interface TapAction {
  matchId: string
  side: 0 | 1
}

export interface BoxState {
  slot: Slot
  /** What tapping this box picks, if anything is currently pickable from it. */
  tap?: TapAction
  /** True if this box's book won its match here and advanced. */
  selected: boolean
  /** True if this box is part of a matchup currently awaiting the user's pick. */
  active: boolean
}

export interface HalfView {
  rd1: [BoxState, BoxState, BoxState]
  rd2: [BoxState, BoxState]
  rd3: BoxState
}

export interface BracketView {
  months: BoxState[]
  top: HalfView
  bottom: HalfView
  champion: BoxState
}

/**
 * Match ids:
 *   pair-0..pair-5  month head-to-heads (Jan/Feb ... Nov/Dec)
 *   t-m1, b-m1      Rd 1 slot 1 vs slot 2 (winner -> first Rd 2 box)
 *   t-m2, b-m2      loser of m1 vs Rd 1 slot 3 (winner -> second Rd 2 box)
 *   t-m3, b-m3      the two Rd 2 boxes (winner -> Rd 3); skipped when they
 *                   already met in m1, in which case the m1 winner advances
 *   final           top Rd 3 vs bottom Rd 3 (winner -> W)
 */
export function downstreamOf(matchId: string): string[] {
  if (matchId.startsWith('pair-')) {
    const half = Number(matchId.slice(5)) < 3 ? 't' : 'b'
    return [`${half}-m1`, `${half}-m2`, `${half}-m3`, 'final']
  }
  const [half, stage] = matchId.split('-')
  if (stage === 'm1') return [`${half}-m2`, `${half}-m3`, 'final']
  if (stage === 'm2') return [`${half}-m3`, 'final']
  if (stage === 'm3') return ['final']
  return []
}

function emptySlot(label: string): Slot {
  return { image: null, label, pending: true }
}

function filled(s: Slot): boolean {
  return !!s.image && !s.pending
}

export function buildBracket(
  images: Partial<Record<MonthIndex, string>>,
  picks: Picks,
): BracketView {
  const monthSlots: Slot[] = MONTHS.map((name, i) => ({
    image: images[i] ?? null,
    label: name,
    pending: false,
  }))

  const months: BoxState[] = monthSlots.map((slot, i) => {
    const pair = Math.floor(i / 2)
    const side = (i % 2) as 0 | 1
    const partner = monthSlots[side === 0 ? i + 1 : i - 1]
    const decidable = !!slot.image && !!partner.image
    const pick = decidable ? picks[`pair-${pair}`] : undefined
    return {
      slot,
      tap: decidable ? { matchId: `pair-${pair}`, side } : undefined,
      selected: decidable && pick === side,
      active: decidable && pick === undefined,
    }
  })

  function pairWinner(pair: number): Slot {
    const a = monthSlots[pair * 2]
    const b = monthSlots[pair * 2 + 1]
    const pick = a.image && b.image ? picks[`pair-${pair}`] : undefined
    return pick === undefined ? emptySlot('Rd 1') : pick === 0 ? a : b
  }

  function buildHalf(prefix: 't' | 'b', firstPair: number) {
    const s = [pairWinner(firstPair), pairWinner(firstPair + 1), pairWinner(firstPair + 2)]
    const m1Id = `${prefix}-m1`
    const m2Id = `${prefix}-m2`
    const m3Id = `${prefix}-m3`

    const m1Decidable = filled(s[0]) && filled(s[1])
    const m1Pick = m1Decidable ? picks[m1Id] : undefined
    const m1Winner = m1Pick === undefined ? emptySlot('Rd 2') : s[m1Pick]
    const m1LoserIndex = m1Pick === undefined ? -1 : 1 - m1Pick
    const m1Loser = m1LoserIndex === -1 ? emptySlot('Rd 2') : s[m1LoserIndex]

    const m2Decidable = m1Pick !== undefined && filled(s[2])
    const m2Pick = m2Decidable ? picks[m2Id] : undefined
    const m2Winner = m2Pick === undefined ? emptySlot('Rd 2') : m2Pick === 0 ? m1Loser : s[2]

    // The Rd 2 pairing is m1's winner vs m2's winner. When m2 was won by
    // m1's loser, those two already met in m1 — the m1 winner advances to
    // Rd 3 automatically instead of asking the user for the same pick twice.
    const m3Auto = m2Pick === 0
    const m3Ready = m1Pick !== undefined && m2Pick !== undefined
    const m3Pick = !m3Ready ? undefined : m3Auto ? 0 : picks[m3Id]
    const halfWinner =
      m3Pick === undefined ? emptySlot('Rd 3') : m3Pick === 0 ? m1Winner : m2Winner

    function rd1Box(j: 0 | 1 | 2): BoxState {
      const slot = s[j]
      if (!filled(slot)) return { slot, selected: false, active: false }

      // Matches this book takes part in, in play order.
      const played: { id: string; side: 0 | 1; decidable: boolean; pick?: 0 | 1 }[] = []
      if (j < 2) played.push({ id: m1Id, side: j as 0 | 1, decidable: m1Decidable, pick: m1Pick })
      if (j === m1LoserIndex)
        played.push({ id: m2Id, side: 0, decidable: m2Decidable, pick: m2Pick })
      if (j === 2) played.push({ id: m2Id, side: 1, decidable: m2Decidable, pick: m2Pick })

      const undecided = played.find((m) => m.decidable && m.pick === undefined)
      // With nothing left to decide, tapping re-picks the latest decided
      // match this book lost, cascading any downstream picks away.
      const repick = [...played].reverse().find((m) => m.decidable && m.pick !== m.side)
      const target = undecided ?? repick

      return {
        slot,
        tap: target ? { matchId: target.id, side: target.side } : undefined,
        selected: played.some((m) => m.pick === m.side),
        active: undecided !== undefined,
      }
    }

    function rd2Box(k: 0 | 1): BoxState {
      const slot = k === 0 ? m1Winner : m2Winner
      if (!filled(slot)) return { slot, selected: false, active: false }
      if (m3Auto) return { slot, selected: k === 0, active: false }
      return {
        slot,
        tap: m3Ready ? { matchId: m3Id, side: k } : undefined,
        selected: m3Pick === k,
        active: m3Ready && m3Pick === undefined,
      }
    }

    return {
      rd1: [rd1Box(0), rd1Box(1), rd1Box(2)] as [BoxState, BoxState, BoxState],
      rd2: [rd2Box(0), rd2Box(1)] as [BoxState, BoxState],
      halfWinner,
    }
  }

  const topHalf = buildHalf('t', 0)
  const bottomHalf = buildHalf('b', 3)

  const finalDecidable = filled(topHalf.halfWinner) && filled(bottomHalf.halfWinner)
  const finalPick = finalDecidable ? picks['final'] : undefined
  const championSlot =
    finalPick === undefined
      ? emptySlot('W')
      : finalPick === 0
        ? topHalf.halfWinner
        : bottomHalf.halfWinner

  function rd3Box(halfWinner: Slot, side: 0 | 1): BoxState {
    if (!filled(halfWinner)) return { slot: halfWinner, selected: false, active: false }
    return {
      slot: halfWinner,
      tap: finalDecidable ? { matchId: 'final', side } : undefined,
      selected: finalPick === side,
      active: finalDecidable && finalPick === undefined,
    }
  }

  return {
    months,
    top: { rd1: topHalf.rd1, rd2: topHalf.rd2, rd3: rd3Box(topHalf.halfWinner, 0) },
    bottom: { rd1: bottomHalf.rd1, rd2: bottomHalf.rd2, rd3: rd3Box(bottomHalf.halfWinner, 1) },
    champion: { slot: championSlot, selected: false, active: false },
  }
}
