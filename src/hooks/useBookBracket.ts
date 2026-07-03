import { useMemo, useState } from 'react'
import type { MonthIndex } from '../lib/bracket'

export interface YearData {
  images: Partial<Record<MonthIndex, string>>
  picks: Record<string, 0 | 1>
}

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 2000

function emptyYearData(): YearData {
  return { images: {}, picks: {} }
}

export function useBookBracket() {
  const [username, setUsername] = useState('')
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [byYear, setByYear] = useState<Record<number, YearData>>({})

  const yearData = byYear[year] ?? emptyYearData()

  function setMonthImage(month: MonthIndex, image: string | null) {
    setByYear((prev) => ({
      ...prev,
      [year]: {
        images: { ...(prev[year]?.images ?? {}), [month]: image ?? undefined },
        // Changing a leaf image can invalidate any match built on top of it.
        picks: {},
      },
    }))
  }

  function setMatchPick(matchId: string, pick: 0 | 1) {
    setByYear((prev) => {
      const current = prev[year] ?? emptyYearData()
      const [round] = matchId.split('-').map(Number)
      // Keep this round's and earlier rounds' picks; clear later rounds since
      // they may have been computed from the outcome we're about to change.
      const picks = Object.fromEntries(
        Object.entries(current.picks).filter(([id]) => Number(id.split('-')[0]) <= round),
      )
      picks[matchId] = pick
      return { ...prev, [year]: { ...current, picks } }
    })
  }

  const years = useMemo(() => {
    const list: number[] = []
    for (let y = CURRENT_YEAR; y >= MIN_YEAR; y--) list.push(y)
    return list
  }, [])

  return {
    username,
    setUsername,
    backgroundImage,
    setBackgroundImage,
    year,
    setYear,
    years,
    images: yearData.images,
    picks: yearData.picks,
    setMonthImage,
    setMatchPick,
  }
}
