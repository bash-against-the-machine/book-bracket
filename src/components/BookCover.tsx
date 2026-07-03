import { useRef } from 'react'
import { readFileAsDataUrl } from '../lib/files'

interface BookCoverProps {
  image: string | null
  label: string
  /** When provided, an empty cover becomes clickable to upload an image. */
  onUpload?: (image: string) => void
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}

export function BookCover({ image, label, onUpload, selected, disabled, onClick }: BookCoverProps) {
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
      className={`book-cover${image ? ' has-image' : ''}${selected ? ' selected' : ''}`}
      disabled={disabled && !isUploadable}
      onClick={() => {
        if (isUploadable) {
          inputRef.current?.click()
        } else {
          onClick?.()
        }
      }}
      aria-label={image ? label : `Add cover for ${label}`}
    >
      {image ? (
        <img src={image} alt={label} />
      ) : (
        <span className="book-cover-empty">
          <span className="plus">+</span>
          <span>Add</span>
        </span>
      )}
      {isUploadable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          hidden
        />
      )}
    </button>
  )
}
