import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toJpeg } from 'html-to-image'
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
  const topBarRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })

  const bracket = useMemo(() => buildBracket(images, picks), [images, picks])

  // Shrink the whole bracket (via CSS transform, not layout reflow) so it
  // always fits within the viewport without scrolling, no matter how tall
  // the current bracket state or window size is. The captured content
  // itself stays full-size and unscaled, so downloaded images stay sharp.
  useLayoutEffect(() => {
    const content = captureRef.current
    if (!content) return

    function recalc() {
      if (!content) return
      const topBarHeight = topBarRef.current?.offsetHeight ?? 0
      const availableHeight = window.innerHeight - topBarHeight - 16
      const availableWidth = window.innerWidth - 16
      const naturalWidth = content.offsetWidth
      const naturalHeight = content.offsetHeight
      if (naturalWidth === 0 || naturalHeight === 0) return

      const nextScale = Math.min(1, availableHeight / naturalHeight, availableWidth / naturalWidth)
      const clampedScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1

      setNaturalSize((prev) =>
        prev.width === naturalWidth && prev.height === naturalHeight
          ? prev
          : { width: naturalWidth, height: naturalHeight },
      )
      setScale((prev) => (Math.abs(prev - clampedScale) < 0.001 ? prev : clampedScale))
    }

    recalc()
    const observer = new ResizeObserver(recalc)
    observer.observe(content)
    window.addEventListener('resize', recalc)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', recalc)
    }
  }, [bracket, images])

  useEffect(() => {
    function handleResize() {
      window.dispatchEvent(new Event('resize'))
    }
    window.addEventListener('orientationchange', handleResize)
    return () => window.removeEventListener('orientationchange', handleResize)
  }, [])

  async function handleShare() {
    if (!captureRef.current) return
    setSharing(true)
    try {
      const dataUrl = await toJpeg(captureRef.current, {
        pixelRatio: 2,
        quality: 0.95,
        backgroundColor: backgroundImage ? undefined : '#ffffff',
      })
      const link = document.createElement('a')
      link.download = `book-bracket-${year}.jpg`
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
      <div ref={topBarRef}>
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
      </div>

      <div className="stage" ref={stageRef}>
        <div
          className="scale-sizer"
          style={{
            width: naturalSize.width * scale || undefined,
            height: naturalSize.height * scale || undefined,
          }}
        >
          <div className="scale-wrapper" style={{ transform: `scale(${scale})` }}>
            <div className="capture-area" ref={captureRef} style={backgroundStyle}>
              <h1 className="bracket-title">
                {username ? `${username}'s` : 'My'} Book Bracket — {year}
              </h1>

              <BracketBoard bracket={bracket} onPick={setMatchPick} />

              <MonthGrid images={images} onUpload={setMonthImage} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
