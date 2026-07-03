import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildBracket, type TapAction } from './lib/bracket'
import { exportBracketImage } from './lib/exportImage'
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
  const captureRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
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
    setSaving(true)
    try {
      const heading = headingRef.current?.textContent?.trim() || 'My Book Bracket'
      const blob = await exportBracketImage({ bracket, heading, year, backgroundImage })
      const file = new File([blob], `book-bracket-${year}.jpg`, { type: 'image/jpeg' })

      // On phones, hand the image to the native share sheet so the user can
      // pick "Save Image" / save to Photos. Desktop falls back to a download.
      const isMobile =
        /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1
      if (isMobile && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: heading })
          return
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
          // Share failed for another reason: fall through to a download.
        }
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = file.name
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
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
              className={`capture-area${backgroundImage ? ' has-bg' : ''}`}
              ref={captureRef}
              style={backgroundStyle}
            >
              <div className="heading-row">
                <h1
                  ref={headingRef}
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
                    className="year-select"
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
