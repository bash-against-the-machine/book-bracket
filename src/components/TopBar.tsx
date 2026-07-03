import { useRef } from 'react'
import { readFileAsDataUrl } from '../lib/files'

interface TopBarProps {
  username: string
  onUsernameChange: (username: string) => void
  year: number
  years: number[]
  onYearChange: (year: number) => void
  onBackgroundChange: (image: string | null) => void
  onShare: () => void
  sharing: boolean
}

export function TopBar({
  username,
  onUsernameChange,
  year,
  years,
  onYearChange,
  onBackgroundChange,
  onShare,
  sharing,
}: TopBarProps) {
  const bgInputRef = useRef<HTMLInputElement>(null)

  async function handleBackgroundFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    onBackgroundChange(dataUrl)
  }

  return (
    <div className="top-bar">
      <div className="top-bar-field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          placeholder="Your name"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
        />
      </div>

      <div className="top-bar-field">
        <label htmlFor="year">Year</label>
        <select id="year" value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="top-bar-field">
        <button type="button" onClick={() => bgInputRef.current?.click()}>
          Background
        </button>
        <input
          ref={bgInputRef}
          type="file"
          accept="image/*"
          onChange={handleBackgroundFile}
          hidden
        />
      </div>

      <button type="button" className="share-button" onClick={onShare} disabled={sharing}>
        {sharing ? 'Preparing…' : 'Share'}
      </button>
    </div>
  )
}
