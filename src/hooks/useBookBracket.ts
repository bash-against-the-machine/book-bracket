import { useMemo, useState } from 'react'
import { downstreamOf, type MonthIndex } from '../lib/bracket'

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
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [byYear, setByYear] = useState<Record<number, YearData>>({})

  const yearData = byYear[year] ?? emptyYearData()

  function setMonthImage(month: MonthIndex, image: string | null) {
    setByYear((prev) => {
      const current = prev[year] ?? emptyYearData()
      // A new cover invalidates its pair's pick and everything built on it.
      const pairId = `pair-${Math.floor(month / 2)}`
      const picks = { ...current.picks }
      delete picks[pairId]
      for (const id of downstreamOf(pairId)) delete picks[id]
      return {
        ...prev,
        [year]: { images: { ...current.images, [month]: image ?? undefined }, picks },
      }
    })
  }

  function setMatchPick(matchId: string, pick: 0 | 1) {
    setByYear((prev) => {
      const current = prev[year] ?? emptyYearData()
      if (current.picks[matchId] === pick) return prev
      const picks = { ...current.picks, [matchId]: pick }
      for (const id of downstreamOf(matchId)) delete picks[id]
      return { ...prev, [year]: { ...current, picks } }
    })
  }

  const years = useMemo(() => {
    const list: number[] = []
    for (let y = CURRENT_YEAR; y >= MIN_YEAR; y--) list.push(y)
    return list
  }, [])

  return {
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
