import type { ReactNode } from 'react'
import { MONTHS, type BoxState, type BracketView, type TapAction } from '../lib/bracket'
import { BookCover } from './BookCover'

interface BracketBoardProps {
  bracket: BracketView
  onTap: (tap: TapAction) => void
  onUpload: (month: number, image: string) => void
  /** Rendered mid-left of the board; excluded from the saved image. */
  hint: ReactNode
  /** Rendered mid-right of the board; excluded from the saved image. */
  actions: ReactNode
}

interface BoxProps {
  box: BoxState
  placeholder?: string
  onTap: (tap: TapAction) => void
  onUpload?: (image: string) => void
}

function Box({ box, placeholder, onTap, onUpload }: BoxProps) {
  const { tap } = box
  return (
    <BookCover
      image={box.slot.image}
      label={box.slot.label}
      placeholder={placeholder}
      onUpload={onUpload}
      selected={box.selected}
      active={box.active}
      disabled={!tap}
      onClick={tap ? () => onTap(tap) : undefined}
    />
  )
}

function MonthsRow({
  bracket,
  offset,
  side,
  onTap,
  onUpload,
}: {
  bracket: BracketView
  offset: number
  side: 'top' | 'bottom'
  onTap: (tap: TapAction) => void
  onUpload: (month: number, image: string) => void
}) {
  return (
    <div className="row lanes">
      {[0, 1, 2].map((p) => {
        const first = offset + p * 2
        return (
          <div className="lane pair-months" key={p}>
            {[first, first + 1].map((i) => (
              <div className="month-cell" key={i}>
                {side === 'top' && <span className="month-name">{MONTHS[i]}</span>}
                <Box box={bracket.months[i]} onTap={onTap} onUpload={(img) => onUpload(i, img)} />
                {side === 'bottom' && <span className="month-name">{MONTHS[i]}</span>}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function PairConnectorRow({ dir }: { dir: 'down' | 'up' }) {
  return (
    <div className="row lanes connector-row" aria-hidden="true">
      {[0, 1, 2].map((p) => (
        <div className="lane" key={p}>
          {dir === 'down' ? (
            <>
              <span className="pair-join down" />
              <span className="stem down" />
            </>
          ) : (
            <>
              <span className="stem up" />
              <span className="pair-join up" />
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function RdRow({
  boxes,
  placeholder,
  dir,
  lanes,
  className,
  onTap,
}: {
  boxes: BoxState[]
  placeholder: string
  /** Adds a connector stem on the side the box is fed from. */
  dir?: 'down' | 'up'
  lanes?: boolean
  className?: string
  onTap: (tap: TapAction) => void
}) {
  return (
    <div className={`row${lanes ? ' lanes' : ''}${className ? ` ${className}` : ''}`}>
      {boxes.map((box, i) => {
        const col = (
          <div className="box-col">
            {dir === 'down' && <span className="stem down" aria-hidden="true" />}
            <Box box={box} placeholder={placeholder} onTap={onTap} />
            {dir === 'up' && <span className="stem up" aria-hidden="true" />}
          </div>
        )
        return lanes ? (
          <div className="lane" key={i}>
            {col}
          </div>
        ) : (
          <div className="box-col-wrap" key={i}>
            {col}
          </div>
        )
      })}
    </div>
  )
}

export function BracketBoard({ bracket, onTap, onUpload, hint, actions }: BracketBoardProps) {
  return (
    <div className="board">
      <div className="half half-top">
        <MonthsRow bracket={bracket} offset={0} side="top" onTap={onTap} onUpload={onUpload} />
        <PairConnectorRow dir="down" />
        <RdRow boxes={bracket.top.rd1} placeholder="Rd 1" lanes className="rd1" onTap={onTap} />
        <RdRow boxes={bracket.top.rd2} placeholder="Rd 2" dir="down" className="rd2" onTap={onTap} />
        <RdRow boxes={[bracket.top.rd3]} placeholder="Rd 3" dir="down" className="rd3" onTap={onTap} />
      </div>

      <div className="mid-row">
        <div className="mid-side no-export">{hint}</div>
        <div className="w-col">
          <span className="stem down" aria-hidden="true" />
          <Box box={bracket.champion} placeholder="W" onTap={onTap} />
          <span className="stem up" aria-hidden="true" />
        </div>
        <div className="mid-side no-export">{actions}</div>
      </div>

      <div className="half half-bottom">
        <RdRow boxes={[bracket.bottom.rd3]} placeholder="Rd 3" dir="up" className="rd3" onTap={onTap} />
        <RdRow boxes={bracket.bottom.rd2} placeholder="Rd 2" dir="up" className="rd2" onTap={onTap} />
        <RdRow boxes={bracket.bottom.rd1} placeholder="Rd 1" lanes className="rd1" onTap={onTap} />
        <PairConnectorRow dir="up" />
        <MonthsRow bracket={bracket} offset={6} side="bottom" onTap={onTap} onUpload={onUpload} />
      </div>
    </div>
  )
}
