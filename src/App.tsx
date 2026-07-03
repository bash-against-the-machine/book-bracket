import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toJpeg } from 'html-to-image'
import { buildBracket, type TapAction } from './lib/bracket'
import { useBookBracket } from './hooks/useBookBracket'
import { BracketBoard } from './components/BracketBoard'
import { readFileAsDataUrl } from './lib/files'
import './App.css'

function App() {
  const {
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

  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const [scale, setScale] = useState(1)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })

  const bracket = useMemo(() => buildBracket(images, picks), [images, picks])

  // Shrink the whole bracket (via CSS transform, not layout reflow) so it
  // always fits within the viewport without scrolling. The captured content
  // itself stays full-size and unscaled, so saved images stay sharp.
  useLayoutEffect(() => {
    const content = captureRef.current
    if (!content) return

    function recalc() {
      if (!content) return
      const availableHeight = window.innerHeight - 12
      const availableWidth = window.innerWidth - 12
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

  async function handleSave() {
    const node = captureRef.current
    if (!node) return
    setSaving(true)
    setExporting(true)
    try {
      // Let the "exporting" class paint so pick highlights are suppressed.
      await new Promise((resolve) => setTimeout(resolve, 50))
      const dataUrl = await toJpeg(node, {
        pixelRatio: 2,
        quality: 0.95,
        backgroundColor: '#ffffff',
        filter: (n) => !(n instanceof HTMLElement && n.classList.contains('no-export')),
      })
      const link = document.createElement('a')
      link.download = `book-bracket-${year}.jpg`
      link.href = dataUrl
      link.click()
    } finally {
      setExporting(false)
      setSaving(false)
    }
  }

  async function handleBackgroundFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBackgroundImage(await readFileAsDataUrl(file))
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
      <div className="stage">
        <div
          className="scale-sizer"
          style={{
            width: naturalSize.width * scale || undefined,
            height: naturalSize.height * scale || undefined,
          }}
        >
          <div className="scale-wrapper" style={{ transform: `scale(${scale})` }}>
            <div
              className={`capture-area${exporting ? ' exporting' : ''}`}
              ref={captureRef}
              style={backgroundStyle}
            >
              <div className="heading-row">
                <h1
                  className="bracket-heading"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  aria-label="Bracket heading"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.currentTarget.blur()
                    }
                  }}
                >
                  My Book Bracket
                </h1>
                <span className="year-wrap">
                  <span className="year-text">{year}</span>
                  <select
                    className="year-select no-export"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    aria-label="Year"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </span>
              </div>

              <BracketBoard
                bracket={bracket}
                onTap={(tap: TapAction) => setMatchPick(tap.matchId, tap.side)}
                onUpload={setMonthImage}
                hint={
                  <p className="hint">
                    Tap &ldquo;My Book Bracket&rdquo; and Year to Customize. Tap a book to pick
                    each matchup&rsquo;s winner.
                  </p>
                }
                actions={
                  <>
                    <button
                      type="button"
                      className="save-button"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save to Device'}
                    </button>
                    <button
                      type="button"
                      className="bg-button"
                      onClick={() => bgInputRef.current?.click()}
                    >
                      Background
                    </button>
                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundFile}
                      hidden
                    />
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
