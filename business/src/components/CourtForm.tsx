import { useState, useRef, FormEvent, ChangeEvent } from 'react'
import { apiFetch } from '../lib/api'

export interface CourtFormData {
  name: string
  location: string
  surface: string
  indoor: boolean
  openHour: number
  closeHour: number
  photoUrls: string[]
}

interface CourtFormProps {
  initialData?: CourtFormData
  onSubmit: (data: CourtFormData) => Promise<void>
  submitLabel?: string
}

const SURFACE_OPTIONS = ['Wooden', 'Synthetic', 'Mat', 'Cement']
const MIN_PHOTOS = 3
const MAX_PHOTOS = 10

export default function CourtForm({ initialData, onSubmit, submitLabel = 'Save Court' }: CourtFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [surface, setSurface] = useState(initialData?.surface ?? 'Wooden')
  const [indoor, setIndoor] = useState(initialData?.indoor ?? false)
  const [openHour, setOpenHour] = useState(initialData?.openHour ?? 6)
  const [closeHour, setCloseHour] = useState(initialData?.closeHour ?? 22)
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialData?.photoUrls ?? [])
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (photoUrls.length + files.length > MAX_PHOTOS) {
      setUploadError(`Maximum ${MAX_PHOTOS} photos allowed`)
      return
    }
    setUploading(true)
    setUploadError('')
    try {
      const uploaded: string[] = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('photo', file)
        const result = await apiFetch<{ url: string }>('/api/upload', { method: 'POST', body: formData })
        uploaded.push(result.url)
      }
      setPhotoUrls(prev => [...prev, ...uploaded])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function addUrl() {
    const url = urlInput.trim()
    if (!url) return
    if (photoUrls.length >= MAX_PHOTOS) { setUploadError(`Maximum ${MAX_PHOTOS} photos`); return }
    if (photoUrls.includes(url)) { setUploadError('Already added'); return }
    setPhotoUrls(prev => [...prev, url])
    setUrlInput('')
    setUploadError('')
  }

  function removePhoto(idx: number) {
    setPhotoUrls(prev => prev.filter((_, i) => i !== idx))
  }

  function movePhoto(from: number, to: number) {
    setPhotoUrls(prev => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Court name is required'); return }
    if (!location.trim()) { setError('Location is required'); return }
    if (openHour >= closeHour) { setError('Open hour must be before close hour'); return }
    if (photoUrls.length < MIN_PHOTOS) {
      setError(`Please add at least ${MIN_PHOTOS} photos (${photoUrls.length}/${MIN_PHOTOS} added)`)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ name, location, surface, indoor, openHour, closeHour, photoUrls })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const canAddMore = photoUrls.length < MAX_PHOTOS

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <label>
        Court Name
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Court A – Main Hall" required />
      </label>

      <label>
        Location / Address
        <input type="text" value={location} onChange={e => setLocation(e.target.value)}
          placeholder="e.g. 123 Sports Ave, Level 2" required />
      </label>

      <label>
        Surface Type
        <select value={surface} onChange={e => setSurface(e.target.value)}>
          {SURFACE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <div className="form-checkbox-row">
        <input type="checkbox" id="indoor" checked={indoor} onChange={e => setIndoor(e.target.checked)} />
        <label htmlFor="indoor" style={{ flexDirection: 'row', gap: '0.4rem', fontWeight: 500 }}>
          Indoor court
        </label>
      </div>

      <div className="form-row">
        <label>
          Open Hour (0–23)
          <input type="number" min={0} max={23} value={openHour}
            onChange={e => setOpenHour(Number(e.target.value))} />
        </label>
        <label>
          Close Hour (0–23)
          <input type="number" min={0} max={23} value={closeHour}
            onChange={e => setCloseHour(Number(e.target.value))} />
        </label>
      </div>

      {/* ── Multi-photo section ── */}
      <div style={{ marginTop: '1rem' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
          Court Photos
          <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>
            {photoUrls.length}/{MAX_PHOTOS} · min {MIN_PHOTOS} required
          </span>
        </div>

        {/* Photo grid */}
        {photoUrls.length > 0 && (
          <div className="photo-grid">
            {photoUrls.map((url, i) => (
              <div key={i} className="photo-thumb">
                <img src={url} alt={`Photo ${i + 1}`}
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23253c2a" width="100" height="100"/><text y="55" x="50" text-anchor="middle" fill="%238ab88a" font-size="12">Error</text></svg>' }} />
                <div className="photo-thumb-actions">
                  {i > 0 && (
                    <button type="button" className="thumb-btn" onClick={() => movePhoto(i, i - 1)} title="Move left">←</button>
                  )}
                  {i < photoUrls.length - 1 && (
                    <button type="button" className="thumb-btn" onClick={() => movePhoto(i, i + 1)} title="Move right">→</button>
                  )}
                  <button type="button" className="thumb-btn danger" onClick={() => removePhoto(i)} title="Remove">✕</button>
                </div>
                {i === 0 && <div className="photo-thumb-badge">Cover</div>}
              </div>
            ))}
          </div>
        )}

        {/* Add photos */}
        {canAddMore && (
          <div className="photo-upload-section" style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}>
                {uploading ? 'Uploading…' : '📁 Upload photos'}
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>or paste URL:</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple
              onChange={handleFileChange} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input type="url" placeholder="https://example.com/photo.jpg"
                value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                style={{ flex: 1 }} />
              <button type="button" className="btn ghost" onClick={addUrl}>Add</button>
            </div>
            {uploadError && <div className="form-error" style={{ marginTop: 6 }}>{uploadError}</div>}
          </div>
        )}

        {photoUrls.length < MIN_PHOTOS && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            🏸 Add {MIN_PHOTOS - photoUrls.length} more photo{MIN_PHOTOS - photoUrls.length !== 1 ? 's' : ''} to continue
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-primary"
        disabled={submitting || uploading || photoUrls.length < MIN_PHOTOS}
        style={{ marginTop: '1.2rem' }}>
        {submitting ? <><span className="spinner" /> Saving…</> : submitLabel}
      </button>
    </form>
  )
}
