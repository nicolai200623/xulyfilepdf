import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import StampOverlay from './StampOverlay'
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'

// Configure pdfjs to use a real Worker instance (avoids CORS/cdn issues)
const workerInstance = new PdfJsWorker()
pdfjs.GlobalWorkerOptions.workerPort = workerInstance

export default function PDFViewer({
  fileName,
  fileBytes,
  stampsByPage,
  onUpdateStamp,
  onPagesMeta,
  onSetActivePage,
}) {
  const containerRef = useRef(null)
  const [numPages, setNumPages] = useState(null)
  const [pageSizes, setPageSizes] = useState({}) // index -> {width,height}
  const [scale, setScale] = useState(1.2)
  const [guides, setGuides] = useState(true)
  const [docError, setDocError] = useState(null)

  // Memoize the file object to avoid unnecessary reload warnings
  const docFile = React.useMemo(() => {
    if (!fileBytes) return null
    const data = fileBytes.buffer ? fileBytes : new Uint8Array(fileBytes)
    return { data }
  }, [fileBytes])

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setDocError(null)
  }

  const onPageLoadSuccess = (page, index) => {
    const viewport = page.getViewport({ scale })
    setPageSizes(prev => ({ ...prev, [index]: { width: viewport.width, height: viewport.height } }))
  }

  // Provide pages meta to parent for export mapping
  useEffect(() => {
    if (!numPages) return
    const meta = {}
    for (let i = 0; i < numPages; i++) {
      const size = pageSizes[i]
      if (!size) continue
      meta[i] = {
        width: size.width,
        height: size.height,
        scale,
      }
    }
    if (Object.keys(meta).length === numPages) {
      onPagesMeta(meta)
    }
  }, [numPages, pageSizes, scale, onPagesMeta])

  return (
    <div className="relative h-full overflow-auto" ref={containerRef}>
      <div className="flex items-center justify-between p-2 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>-</button>
          <div>{Math.round(scale * 100)}%</div>
          <button className="px-2 py-1 border rounded" onClick={() => setScale(s => Math.min(3, s + 0.1))}>+</button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} />
          Guides
        </label>
      </div>

      <div className="p-4">
        {docError && (
          <div className="mb-2 text-red-600 text-sm">Lỗi tải PDF: {String(docError)}</div>
        )}
        {docFile ? (
          <Document
            key={fileName || 'no-name'}
            file={docFile}
            loading={<div className="text-gray-500">Đang tải PDF...</div>}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(e) => { console.error('PDF load error', e); setDocError(e?.message || e) }}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div
                key={`page_${index}`}
                data-page-wrapper
                data-page-index={index}
                className="relative inline-block mb-4"
                onMouseEnter={() => onSetActivePage && onSetActivePage(index)}
              >
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div className="text-gray-400">Trang {index+1}...</div>}
                  onLoadSuccess={(p) => onPageLoadSuccess(p, index)}
                />
                {(stampsByPage[index] || []).map(stamp => (
                  <StampOverlay
                    key={stamp.id}
                    pageIndex={index}
                    stamp={stamp}
                    onChange={s => onUpdateStamp(index, s)}
                    showGuides={guides}
                  />
                ))}
              </div>
            ))}
          </Document>
        ) : (
          <div className="text-gray-500">Hãy upload một file PDF để bắt đầu</div>
        )}
      </div>
    </div>
  )
}

