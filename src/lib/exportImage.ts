import type { BoxState, BracketView, Slot } from './bracket'

export interface ExportInput {
  bracket: BracketView
  heading: string
  year: number
  backgroundImage: string | null
}

// The export draws the bracket onto a canvas from app state instead of
// screenshotting the DOM (html-to-image was unreliable on phones: covers,
// background and text were dropped from the capture on WebKit).

// Design-space layout constants; the canvas renders at 2x for sharpness.
const W = 1080
const COVER_W = 96
const COVER_H = 144
const CHAMP_W = 128
const CHAMP_H = 192
const PAIR_GAP = 16
const PAIR_SPACING = 48
const ROW_GAP = 30 // stem zone between rounds
const JOIN_H = 34 // pair-connector zone between months and Rd 1
const LABEL_H = 34
const PAD = 44
const HEADING_H = 88

const TEXT = '#08060d'
const MUTED = '#5f5a66'
const BOX_BG = '#b9b8bf'
const LINE = '#ffffff'
const LINE_W = 5

const pairWidth = COVER_W * 2 + PAIR_GAP
const rowWidth = pairWidth * 3 + PAIR_SPACING * 2
const x0 = (W - rowWidth) / 2
const CX = W / 2

const laneCx = (p: number) => x0 + p * (pairWidth + PAIR_SPACING) + pairWidth / 2
const monthX = (i: number) =>
  x0 + Math.floor((i % 6) / 2) * (pairWidth + PAIR_SPACING) + (i % 2) * (COVER_W + PAIR_GAP)
const rd2Cx = (k: number) => (laneCx(k) + laneCx(k + 1)) / 2

const yTopLabel = PAD + HEADING_H
const yTopMonths = yTopLabel + LABEL_H
const yTopRd1 = yTopMonths + COVER_H + JOIN_H
const yTopRd2 = yTopRd1 + COVER_H + ROW_GAP
const yTopRd3 = yTopRd2 + COVER_H + ROW_GAP
const yChamp = yTopRd3 + COVER_H + ROW_GAP
const yBotRd3 = yChamp + CHAMP_H + ROW_GAP
const yBotRd2 = yBotRd3 + COVER_H + ROW_GAP
const yBotRd1 = yBotRd2 + COVER_H + ROW_GAP
const yBotMonths = yBotRd1 + COVER_H + JOIN_H
const yBotLabel = yBotMonths + COVER_H + 8
const H = yBotLabel + LABEL_H + PAD - 10

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image failed to load'))
    img.src = src
  })
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/** Draws an image cover-fit (center-cropped) into the given rect. */
function drawCoverFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height)
  const sw = w / scale
  const sh = h / scale
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

/** Vertical connector line from `from` to `to`, arrowhead at `to`. */
function stem(ctx: CanvasRenderingContext2D, cx: number, from: number, to: number) {
  const dir = to > from ? 1 : -1
  ctx.beginPath()
  ctx.moveTo(cx, from)
  ctx.lineTo(cx, to - dir * 9)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx, to)
  ctx.lineTo(cx - 7, to - dir * 11)
  ctx.lineTo(cx + 7, to - dir * 11)
  ctx.closePath()
  ctx.fill()
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  slot: Slot,
  x: number,
  y: number,
  w: number,
  h: number,
  placeholder: string,
  isMonth: boolean,
  images: Map<string, HTMLImageElement>,
) {
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 5
  roundRectPath(ctx, x, y, w, h, 8)
  ctx.fillStyle = BOX_BG
  ctx.fill()
  ctx.restore()

  const img = slot.image ? images.get(slot.image) : undefined
  if (img) {
    ctx.save()
    roundRectPath(ctx, x, y, w, h, 8)
    ctx.clip()
    drawCoverFit(ctx, img, x, y, w, h)
    ctx.restore()
    return
  }

  // Book spine hint on empty boxes.
  ctx.save()
  roundRectPath(ctx, x, y, w, h, 8)
  ctx.clip()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
  ctx.fillRect(x, y, 5, h)
  ctx.restore()

  ctx.fillStyle = MUTED
  ctx.textAlign = 'center'
  const cx = x + w / 2
  const cy = y + h / 2
  if (isMonth) {
    ctx.font = '300 44px system-ui, sans-serif'
    ctx.fillText('+', cx, cy - 4)
    ctx.font = '20px system-ui, sans-serif'
    ctx.fillText('Add', cx, cy + 28)
  } else {
    ctx.font = '600 22px system-ui, sans-serif'
    ctx.fillText(placeholder, cx, cy + 8)
  }
}

export async function exportBracketImage(input: ExportInput): Promise<Blob> {
  const { bracket, heading, year, backgroundImage } = input

  const images = new Map<string, HTMLImageElement>()
  const sources = new Set<string>()
  for (const box of bracket.months) if (box.slot.image) sources.add(box.slot.image)
  await Promise.all(
    [...sources].map(async (src) => {
      images.set(src, await loadImage(src))
    }),
  )

  const dpr = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.scale(dpr, dpr)

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  if (backgroundImage) {
    drawCoverFit(ctx, await loadImage(backgroundImage), 0, 0, W, H)
  }

  // Over a background photo, dark text disappears — use white with a soft
  // shadow instead. On the plain white default, keep dark text.
  const textColor = backgroundImage ? '#ffffff' : TEXT
  const withTextShadow = (draw: () => void) => {
    ctx.save()
    if (backgroundImage) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 1
    }
    draw()
    ctx.restore()
  }

  // Heading + year, centered together, same font for both
  ctx.font = '600 46px system-ui, sans-serif'
  ctx.textAlign = 'left'
  const headingWidth = ctx.measureText(heading).width
  const yearWidth = ctx.measureText(String(year)).width
  const gap = 48
  const startX = (W - (headingWidth + gap + yearWidth)) / 2
  const headingBaseline = PAD + 52
  withTextShadow(() => {
    ctx.fillStyle = textColor
    ctx.fillText(heading, startX, headingBaseline)
    ctx.fillText(String(year), startX + headingWidth + gap, headingBaseline)
  })

  // Connector lines (drawn before boxes so arrowheads tuck under box edges)
  ctx.save()
  ctx.strokeStyle = LINE
  ctx.fillStyle = LINE
  ctx.lineWidth = LINE_W
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)'
  ctx.shadowBlur = 4

  for (let p = 0; p < 3; p++) {
    const lcx = monthX(p * 2) + COVER_W / 2
    const rcx = monthX(p * 2 + 1) + COVER_W / 2

    // Top half: months join downward into Rd 1
    const yTopBar = yTopMonths + COVER_H + 12
    ctx.beginPath()
    ctx.moveTo(lcx, yTopMonths + COVER_H + 2)
    ctx.lineTo(lcx, yTopBar)
    ctx.lineTo(rcx, yTopBar)
    ctx.lineTo(rcx, yTopMonths + COVER_H + 2)
    ctx.stroke()
    stem(ctx, laneCx(p), yTopBar, yTopRd1 - 2)

    // Bottom half: months join upward into Rd 1
    const yBotBar = yBotMonths - 12
    ctx.beginPath()
    ctx.moveTo(lcx, yBotMonths - 2)
    ctx.lineTo(lcx, yBotBar)
    ctx.lineTo(rcx, yBotBar)
    ctx.lineTo(rcx, yBotMonths - 2)
    ctx.stroke()
    stem(ctx, laneCx(p), yBotBar, yBotRd1 + COVER_H + 2)
  }

  for (let k = 0; k < 2; k++) {
    stem(ctx, rd2Cx(k), yTopRd1 + COVER_H + 4, yTopRd2 - 2)
    stem(ctx, rd2Cx(k), yBotRd1 - 4, yBotRd2 + COVER_H + 2)
  }
  stem(ctx, CX, yTopRd2 + COVER_H + 4, yTopRd3 - 2)
  stem(ctx, CX, yBotRd2 - 4, yBotRd3 + COVER_H + 2)
  stem(ctx, CX, yTopRd3 + COVER_H + 4, yChamp - 2)
  stem(ctx, CX, yBotRd3 - 4, yChamp + CHAMP_H + 2)
  ctx.restore()

  // Month labels
  withTextShadow(() => {
    ctx.fillStyle = textColor
    ctx.textAlign = 'center'
    ctx.font = '600 22px system-ui, sans-serif'
    for (let i = 0; i < 6; i++) {
      ctx.fillText(bracket.months[i].slot.label, monthX(i) + COVER_W / 2, yTopLabel + 24)
    }
    for (let i = 6; i < 12; i++) {
      ctx.fillText(bracket.months[i].slot.label, monthX(i) + COVER_W / 2, yBotLabel + 24)
    }
  })

  // Boxes
  const box = (
    b: BoxState,
    x: number,
    y: number,
    placeholder: string,
    isMonth = false,
    w = COVER_W,
    h = COVER_H,
  ) => drawBox(ctx, b.slot, x, y, w, h, placeholder, isMonth, images)

  for (let i = 0; i < 12; i++) {
    box(bracket.months[i], monthX(i), i < 6 ? yTopMonths : yBotMonths, '', true)
  }
  for (let j = 0; j < 3; j++) {
    box(bracket.top.rd1[j], laneCx(j) - COVER_W / 2, yTopRd1, 'Rd 1')
    box(bracket.bottom.rd1[j], laneCx(j) - COVER_W / 2, yBotRd1, 'Rd 1')
  }
  for (let k = 0; k < 2; k++) {
    box(bracket.top.rd2[k], rd2Cx(k) - COVER_W / 2, yTopRd2, 'Rd 2')
    box(bracket.bottom.rd2[k], rd2Cx(k) - COVER_W / 2, yBotRd2, 'Rd 2')
  }
  box(bracket.top.rd3, CX - COVER_W / 2, yTopRd3, 'Rd 3')
  box(bracket.bottom.rd3, CX - COVER_W / 2, yBotRd3, 'Rd 3')
  box(bracket.champion, CX - CHAMP_W / 2, yChamp, 'W', false, CHAMP_W, CHAMP_H)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas export failed'))),
      'image/jpeg',
      0.92,
    )
  })
}
