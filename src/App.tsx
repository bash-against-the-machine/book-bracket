import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { buildBracket } from './lib/bracket'
import { useBookBracket } from './hooks/useBookBracket'
import { TopBar } from './components/TopBar'
import { BracketBoard } from './components/BracketBoard'
import { MonthGrid } from './components/MonthGrid'
import './App.css'

function App() {
  const {
    username,
    setUsername,
    backgroundImage,
    setBackgroundImage,
    year,
    setYear,
    years,
    images,
    picks,
    setMonthImage,
    setMatchPick,
  } = useBookBracket()

  const [sharing, setSharing] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)

  const bracket = useMemo(() => buildBracket(images, picks), [images, picks])

  async function handleShare() {
    if (!captureRef.current) return
    setSharing(true)
    try {
      const dataUrl = await toPng(captureRef.current, { pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `book-bracket-${year}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setSharing(false)
    }
  }

  const backgroundStyle = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  return (
    <div id="app" style={backgroundStyle}>
      <TopBar
        username={username}
        onUsernameChange={setUsername}
        year={year}
        years={years}
        onYearChange={setYear}
        onBackgroundChange={setBackgroundImage}
        onShare={handleShare}
        sharing={sharing}
      />

      <div className="capture-area" ref={captureRef} style={backgroundStyle}>
        <h1 className="bracket-title">
          {username ? `${username}'s` : 'My'} Book Bracket — {year}
        </h1>

        <BracketBoard bracket={bracket} onPick={setMatchPick} />

        <MonthGrid images={images} onUpload={setMonthImage} />
      </div>
    </div>
  )
}

export default App
