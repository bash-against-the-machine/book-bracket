import type { BracketResult } from '../lib/bracket'
import { BookCover } from './BookCover'

interface BracketBoardProps {
  bracket: BracketResult
  onPick: (matchId: string, pick: 0 | 1) => void
}

export function BracketBoard({ bracket, onPick }: BracketBoardProps) {
  // Highest round number first: the final is nearest the champion, round 1
  // (the month pairings) is nearest the month grid at the bottom of the page.
  const roundsTopDown = [...bracket.rounds].reverse()
  const finalRound = bracket.rounds.length

  return (
    <div className="bracket-board">
      <div className="round-section">
        <div className="round-label">Winner</div>
        <div className="champion">
          <BookCover
            image={bracket.champion?.image ?? null}
            label={bracket.champion?.label ?? 'Best Book of the Year'}
            disabled
          />
        </div>
      </div>

      {roundsTopDown.map((matches) => {
        const roundNumber = matches[0]?.round
        return (
          <div className="round-section" key={roundNumber}>
            <div className="connector" aria-hidden="true" />
            <div className="round-label">{roundNumber === finalRound ? 'Final' : `Round ${roundNumber}`}</div>
            <div className="bracket-round">
              {matches.map((match) => {
                if (!match.b) {
                  // Bye: nothing to decide, just show the slot passing through.
                  return (
                    <div className="matchup bye" key={match.id}>
                      <BookCover image={match.a.image} label={match.a.label} disabled />
                    </div>
                  )
                }

                const canDecide =
                  !!match.a.image && !match.a.pending && !!match.b.image && !match.b.pending

                return (
                  <div className="matchup" key={match.id}>
                    <BookCover
                      image={match.a.image}
                      label={match.a.pending ? 'Undecided' : match.a.label}
                      selected={match.pick === 0}
                      disabled={!canDecide}
                      onClick={() => onPick(match.id, 0)}
                    />
                    <span className="vs">vs</span>
                    <BookCover
                      image={match.b.image}
                      label={match.b.pending ? 'Undecided' : match.b.label}
                      selected={match.pick === 1}
                      disabled={!canDecide}
                      onClick={() => onPick(match.id, 1)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="connector" aria-hidden="true" />
    </div>
  )
}
