import React, { useMemo, useState } from 'react'
import { DownloadIcon, FileTextIcon, PaperclipIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { Doc, DocType, MAX_STORED_FILE, docTypes, formatFileSize } from '../store/documents'
import { abrirSoporte, subirSoporte } from '../store/storageApi'
import { Pagination, paginate } from '../components/Pagination'

const DOC_PAGE = 9

export function DocumentalPage() {
  const { docs } = useDemo()
  const { can } = useSession()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'Todos' | DocType>('Todos')
  const [page, setPage] = useState(1)
  const [showUpload, setShowUpload] = useState(false)
  const [editing, setEditing] = useState<Doc | null>(null)
  const canManage = can('documents.manage')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs.filter((doc) => (filter === 'Todos' || doc.type === filter) && `${doc.title} ${doc.code}`.toLowerCase().includes(q))
  }, [docs, filter, query])
  const pageDocs = paginate(filtered, page, DOC_PAGE)

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Memoria institucional"
        title="Documental"
        description="Repositorio seguro de actas, resoluciones e informes de la organización."
        action={
          can('documents.manage') ? (
            <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep">
              <PlusIcon className="h-4 w-4" />
              Cargar documento
            </button>
          ) : null
        }
      />

      <section className="rounded-2xl border border-ink/[0.08] bg-white">
        <div className="flex flex-col gap-3 border-b border-ink/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative max-w-md flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Buscar por título o código" className="w-full rounded-xl border border-ink/10 bg-canvas/45 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
          </label>
          <div className="flex gap-2 overflow-x-auto">
            {(['Todos', ...docTypes] as const).map((item) => (
              <button onClick={() => { setFilter(item); setPage(1) }} key={item} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === item ? 'bg-night text-white' : 'bg-canvas text-ink/60 hover:bg-ink/5'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 pt-4 text-xs text-ink/50">
          <span>{filtered.length} documento(s){filter !== 'Todos' ? ` · ${filter}` : ''}</span>
          <span>{docs.length} en el repositorio</span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {pageDocs.map((document) => <DocCard key={document.id} doc={document} canManage={canManage} onEdit={setEditing} />)}
          {filtered.length === 0 ? <div className="col-span-full py-12 text-center text-sm text-ink/50">No hay documentos que coincidan con la búsqueda.</div> : null}
        </div>
        <Pagination page={page} size={DOC_PAGE} total={filtered.length} onPage={setPage} />
      </section>

      {showUpload ? <UploadModal onClose={() => setShowUpload(false)} /> : null}
      {editing ? <EditDocModal doc={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

function DocCard({ doc, canManage, onEdit }: { doc: Doc; canManage: boolean; onEdit: (d: Doc) => void }) {
  const { notify, deleteDoc } = useDemo()

  function handleDelete() {
    if (window.confirm(`¿Eliminar el documento "${doc.title}"?`)) deleteDoc(doc.id, doc.code)
  }

  function download() {
    if (doc.storagePath) {
      abrirSoporte(doc.storagePath)
      notify(`Abriendo ${doc.fileName}…`, 'info')
    } else {
      notify('Este documento no tiene archivo almacenado.', 'warning')
    }
  }

  return (
    <article className="group rounded-xl border border-ink/[0.08] p-4 transition hover:border-gold/50 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/12"><FileTextIcon className="h-5 w-5 text-[#9a6b20]" /></div>
        <StatusBadge tone="night">{doc.type}</StatusBadge>
      </div>
      <h2 className="mt-4 font-display text-sm font-semibold leading-snug text-ink">{doc.title}</h2>
      <p className="mt-2 text-xs text-ink/50">{doc.code}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/60"><PaperclipIcon className="h-3.5 w-3.5 shrink-0 text-gold" /><span className="truncate">{doc.fileName}</span></p>
      <div className="mt-4 flex items-center justify-between border-t border-ink/[0.07] pt-3 text-xs text-ink/50">
        <span>{doc.date} · {formatFileSize(doc.fileSize)}</span>
        <div className="flex items-center gap-0.5">
          {canManage ? (
            <>
              <button onClick={() => onEdit(doc)} className="rounded-lg p-1.5 text-ink/45 transition hover:bg-canvas hover:text-night" aria-label={`Editar ${doc.title}`}><PencilIcon className="h-4 w-4" /></button>
              <button onClick={handleDelete} className="rounded-lg p-1.5 text-ink/45 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar ${doc.title}`}><Trash2Icon className="h-4 w-4" /></button>
            </>
          ) : null}
          <button onClick={download} className="rounded-lg p-1.5 text-night transition hover:bg-canvas" aria-label={`Descargar ${doc.title}`}><DownloadIcon className="h-4 w-4" /></button>
        </div>
      </div>
    </article>
  )
}

function EditDocModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const { updateDoc } = useDemo()
  const [title, setTitle] = useState(doc.title)
  const [type, setType] = useState<DocType>(doc.type)
  const valid = title.trim() !== ''
  const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'

  function save() {
    if (!valid) return
    updateDoc(doc.id, { title: title.trim(), type })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Documental</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Editar documento</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>
        <p className="-mt-1 mb-4 text-sm text-ink/50">Código: <strong>{doc.code}</strong> · Archivo: {doc.fileName}</p>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Título <span className="text-brick">*</span></span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Tipo</span>
            <select value={type} onChange={(e) => setType(e.target.value as DocType)} className={inputClass}>
              {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={save} disabled={!valid} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar cambios</button>
        </div>
      </section>
    </div>
  )
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const { addDoc, notify } = useDemo()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<DocType>('Acta')
  const [file, setFile] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  const valid = title.trim() !== '' && file !== null

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_STORED_FILE) { notify(`El archivo supera el máximo (${formatFileSize(MAX_STORED_FILE)}).`, 'warning'); return }
    if (title.trim() === '') setTitle(f.name.replace(/\.[^.]+$/, ''))
    setFile(f)
  }

  async function submit() {
    if (!valid || !file) return
    setSubiendo(true)
    try {
      const path = await subirSoporte('documental', file)
      addDoc({ title: title.trim(), type, fileName: file.name, fileSize: file.size, storagePath: path })
      onClose()
    } catch {
      notify('No se pudo subir el archivo. Revisa el bucket de Storage.', 'warning')
    } finally {
      setSubiendo(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Documental</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Cargar documento</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>
        <p className="-mt-1 mb-4 text-sm text-ink/50">El código se genera automáticamente según el tipo.</p>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Título <span className="text-brick">*</span></span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del documento" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Tipo</span>
            <select value={type} onChange={(e) => setType(e.target.value as DocType)} className={inputClass}>
              {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Archivo <span className="text-brick">*</span></span>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink/25 bg-canvas/45 px-3 py-2.5 text-sm transition hover:border-night/40">
              <input type="file" className="hidden" onChange={onFile} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt" />
              <PaperclipIcon className="h-4 w-4 shrink-0 text-gold" />
              {file ? (
                <span className="min-w-0 truncate text-ink">{file.name} <span className="text-ink/45">· {formatFileSize(file.size)}</span></span>
              ) : (
                <span className="text-ink/45">Seleccionar archivo…</span>
              )}
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={submit} disabled={!valid || subiendo} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{subiendo ? 'Subiendo…' : 'Cargar documento'}</button>
        </div>
      </section>
    </div>
  )
}
