import type { BracketResult } from '../lib/bracket'
import { BookCover } from './BookCover'

interface BracketBoardProps {
  bracket: BracketResult
  onPick: (matchId: string, pick: 0 | 1) => void
}

export function BracketBoard({ bracket, onPick }: BracketBoardProps) {
  const roundsTopDown = [...bracket.rounds].reverse()

  return (
    <div className="bracket-board">
      {bracket.champion && (
        <div className="champion">
          <div className="champion-label">Best Book of the Year</div>
          <BookCover image={bracket.champion.image} label={bracket.champion.label} disabled />
        </div>
      )}

      {roundsTopDown.map((matches) => (
        <div className="bracket-round" key={matches[0]?.round}>
          {matches.map((match) => {
            if (!match.b) {
              // Bye: nothing to decide, just show the slot passing through.
              return (
                <div className="matchup bye" key={match.id}>
                  <BookCover image={match.a.image} label={match.a.label} disabled />
                </div>
              )
            }

            const canDecide = !!match.a.image && !match.a.pending && !!match.b.image && !match.b.pending

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
      ))}
    </div>
  )
}
