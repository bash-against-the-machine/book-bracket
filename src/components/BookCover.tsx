import { useRef } from 'react'
import { readFileAsDataUrl } from '../lib/files'

interface BookCoverProps {
  image: string | null
  label: string
  /** Text shown inside an empty, non-uploadable box (e.g. "Rd 1", "W"). */
  placeholder?: string
  /** When provided, an empty cover becomes clickable to upload an image. */
  onUpload?: (image: string) => void
  selected?: boolean
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

export function BookCover({
  image,
  label,
  placeholder,
  onUpload,
  selected,
  active,
  disabled,
  onClick,
}: BookCoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    onUpload?.(dataUrl)
  }

  const isUploadable = !image && onUpload

  return (
    <button
      type="button"
      className={`book-cover${image ? ' has-image' : ''}${selected ? ' selected' : ''}${active ? ' active' : ''}`}
      disabled={disabled && !isUploadable}
      onClick={() => {
        if (isUploadable) {
          inputRef.current?.click()
        } else {
          onClick?.()
        }
      }}
      aria-label={image ? label : isUploadable ? `Add cover for ${label}` : label}
    >
      {image ? (
        <img src={image} alt={label} />
      ) : isUploadable ? (
        <span className="book-cover-empty">
          <span className="plus">+</span>
          <span>Add</span>
        </span>
      ) : (
        <span className="book-cover-empty">{placeholder ?? ''}</span>
      )}
      {isUploadable && (
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} hidden />
      )}
    </button>
  )
}
