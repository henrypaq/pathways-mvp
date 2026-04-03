'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  user_id: string
  case_id: string
  type: string | null
  file_url: string
  extracted_data: unknown
  created_at: string
}

interface Props {
  initialDocuments: Document[]
  caseId: string
  userId: string
}

const REQUIRED_DOCS = [
  {
    type: 'passport',
    name: 'Passport',
    description: 'Valid for at least 6 months beyond intended stay',
  },
  {
    type: 'employment_letter',
    name: 'Employment Letter',
    description: 'Must include job title, salary, start date, weekly hours',
  },
  {
    type: 'language_test',
    name: 'Language Test Results',
    description: 'IELTS, TOEFL, TEF, TCF, or CELPIP official results',
  },
  {
    type: 'education_credential',
    name: 'Education Credential',
    description: 'Degree, diploma, or official transcript',
  },
  {
    type: 'bank_statement',
    name: 'Bank Statement',
    description: 'Last 3 months, showing sufficient funds',
  },
  {
    type: 'police_certificate',
    name: 'Police Certificate',
    description: 'From every country lived in for 6+ months',
  },
  {
    type: 'photos',
    name: 'Passport Photos',
    description: '2 identical photos meeting IRCC specifications',
  },
]

const DOC_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  REQUIRED_DOCS.map((d) => [d.type, d.name])
)

function getFileName(filePath: string): string {
  const parts = filePath.split('/')
  const raw = parts[parts.length - 1] ?? filePath
  // Strip the timestamp prefix: {timestamp}_{original_name}
  const underscoreIdx = raw.indexOf('_')
  return underscoreIdx !== -1 ? raw.slice(underscoreIdx + 1) : raw
}

export function DocumentsManager({ initialDocuments, caseId, userId }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [selectedType, setSelectedType] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const uploadedTypes = new Set(documents.map((d) => d.type))

  async function handleFile(file: File) {
    setUploadError(null)

    if (!selectedType) {
      setUploadError('Please select a document type first.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds the 10 MB limit.')
      return
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      setUploadError('Only PDF, JPG, and PNG files are accepted.')
      return
    }

    setUploading(true)
    try {
      const filePath = `${userId}/${selectedType}/${Date.now()}_${file.name}`

      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (storageError) {
        setUploadError(storageError.message)
        return
      }

      const { data: row, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          case_id: caseId,
          type: selectedType,
          file_url: storageData.path,
          extracted_data: null,
        })
        .select()
        .single()

      if (dbError) {
        setUploadError(dbError.message)
        // Best-effort cleanup
        await supabase.storage.from('documents').remove([storageData.path])
        return
      }

      setDocuments((prev) => [row as Document, ...prev])
      setSelectedType('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc: Document) {
    setDeleteError(null)

    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.file_url])

    if (storageError) {
      setDeleteError(storageError.message)
      return
    }

    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id)

    if (dbError) {
      setDeleteError(dbError.message)
      return
    }

    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedType, caseId, userId]
  )

  return (
    <div className="max-w-3xl pb-6">
      {/* Required Documents Checklist */}
      <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-5 mb-4">
        <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-4">
          Required Documents
        </h3>
        <div className="space-y-2">
          {REQUIRED_DOCS.map((doc) => {
            const uploaded = uploadedTypes.has(doc.type)
            return (
              <div
                key={doc.type}
                className="flex items-center gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#171717]">{doc.name}</p>
                  <p className="text-[11px] text-[#A3A3A3] mt-0.5">{doc.description}</p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    uploaded
                      ? 'bg-[#DCFCE7] text-[#16A34A]'
                      : 'bg-[#FEE2E2] text-[#DC2626]'
                  }`}
                >
                  {uploaded ? 'Uploaded' : 'Missing'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-5 mb-4">
        <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-4">
          Upload a Document
        </h3>

        <div className="mb-4">
          <label className="block text-[11px] text-[#A3A3A3] uppercase tracking-wider mb-1.5">
            Document Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-[8px] text-[13px] text-[#171717] px-3 py-2 focus:outline-none focus:border-[#534AB7] transition-colors bg-white appearance-none"
          >
            <option value="">Select document type…</option>
            {REQUIRED_DOCS.map((d) => (
              <option key={d.type} value={d.type}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[10px] p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-[#534AB7] bg-[#EEEDFE]'
              : 'border-[#E5E5E5] hover:border-[#534AB7]/50 hover:bg-[#FAFAFA]'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[#A3A3A3]"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? (
              <p className="text-[13px] text-[#534AB7] font-medium">Uploading…</p>
            ) : (
              <>
                <p className="text-[13px] text-[#525252]">
                  Drag your file here or{' '}
                  <span className="text-[#534AB7] font-medium">click to browse</span>
                </p>
                <p className="text-[11px] text-[#A3A3A3]">PDF, JPG, PNG · Max 10 MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>

        {uploadError && (
          <p className="mt-3 text-[12px] text-[#DC2626]">{uploadError}</p>
        )}
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-5">
        <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-4">
          Uploaded Documents
        </h3>

        {deleteError && (
          <p className="mb-3 text-[12px] text-[#DC2626]">{deleteError}</p>
        )}

        {documents.length === 0 ? (
          <p className="text-[13px] text-[#A3A3A3] py-2">No documents uploaded yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#F5F5F5]">
                {['Type', 'File', 'Uploaded', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="pb-2.5 text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider pr-4 last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-[#F5F5F5] last:border-0">
                  <td className="py-3 pr-4 text-[12px] font-medium text-[#171717] whitespace-nowrap">
                    {DOC_TYPE_LABELS[doc.type ?? ''] ?? doc.type ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-[12px] text-[#525252] max-w-[200px] truncate">
                    {getFileName(doc.file_url)}
                  </td>
                  <td className="py-3 pr-4 text-[12px] text-[#A3A3A3] whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString('en-CA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleDelete(doc)}
                      className="text-[11px] text-[#DC2626] hover:text-[#B91C1C] transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
