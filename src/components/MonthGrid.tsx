import { MONTHS, type MonthIndex } from '../lib/bracket'
import { BookCover } from './BookCover'

interface MonthGridProps {
  images: Partial<Record<MonthIndex, string>>
  onUpload: (month: MonthIndex, image: string) => void
}

export function MonthGrid({ images, onUpload }: MonthGridProps) {
  return (
    <div className="month-grid">
      {MONTHS.map((name, i) => (
        <div className="month-cell" key={name}>
          <BookCover
            image={images[i] ?? null}
            label={name}
            onUpload={(image) => onUpload(i, image)}
          />
          <div className="month-name">{name}</div>
        </div>
      ))}
    </div>
  )
}
