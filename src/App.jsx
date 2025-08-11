import React, { useMemo, useState } from 'react'
import PDFViewer from './components/PDFViewer'
import StampEditor from './components/StampEditor'
import { exportStampedPDF } from './components/PDFExporter'
import useUndoRedo from './hooks/useUndoRedo'

function uid() { return Math.random().toString(36).slice(2) }

const DEFAULT_STAMP = {
  line1: 'CHỨNG THỰC BẢN SAO ĐÚNG VỚI BẢN CHÍNH!',
  line2: 'Số chứng thực:........quyển số: 1....../2025 SCT/BS',
  line3: 'Ngày: 11-12-2025',
  line4: 'CÔNG CHỨNG VIÊN',
  width: 320,
  height: 120,
  rotation: 0,
}

export default function App() {
  const [file, setFile] = useState(null)
  // Keep two separate copies: one for viewing (may be transferred by pdfjs worker), one for exporting (safe copy)
  const [viewerBytes, setViewerBytes] = useState(null)
  const [fileArrayBuffer, setFileArrayBuffer] = useState(null) // export-safe bytes
  const [pagesMeta, setPagesMeta] = useState({})
  const [activePage, setActivePage] = useState(0)

  // All stamps grouped by page index
  const undo = useUndoRedo({}) // { [pageIndex]: [stamps] }
  const stampsByPage = undo.state

  const [draft, setDraft] = useState(DEFAULT_STAMP)
  const [exporting, setExporting] = useState(false)

  const memoFileName = useMemo(() => file?.name || 'uploaded.pdf', [file])

  const onFileChange = async (f) => {
    if (!f) return
    setFile(f)
    const arr = await f.arrayBuffer()
    // Create two independent copies to avoid detachment by pdfjs worker
    const src = new Uint8Array(arr)
    const viewCopy = new Uint8Array(src.length); viewCopy.set(src)
    const exportCopy = new Uint8Array(src.length); exportCopy.set(src)
    setViewerBytes(viewCopy)
    setFileArrayBuffer(exportCopy)
    setActivePage(0)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f && f.type === 'application/pdf') onFileChange(f)
  }

  const addStamp = (pageIndex = activePage) => {
    if (!fileArrayBuffer) return
    const targetPage = Number.isFinite(pageIndex) ? pageIndex : 0
    const newStamp = {
      id: uid(),
      elId: `stamp-${uid()}`,
      x: 40,
      y: 40,
      ...draft,
    }
    const next = { ...stampsByPage, [targetPage]: [...(stampsByPage[targetPage]||[]), newStamp] }
    undo.set(next)
  }

  const clearStamps = () => undo.set({})

  const updateStamp = (pageIndex, updated) => {
    const arr = (stampsByPage[pageIndex] || [])
    const nextArr = arr.map(s => s.id === updated.id ? updated : s)
    undo.set({ ...stampsByPage, [pageIndex]: nextArr })
  }

  const onExport = async () => {
    if (!fileArrayBuffer) return
    setExporting(true)
    try {
      const blob = await exportStampedPDF({ fileArrayBuffer: (fileArrayBuffer.buffer ? fileArrayBuffer : new Uint8Array(fileArrayBuffer)), pagesMeta, stampsByPage })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stamped-${memoFileName}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Có lỗi khi export PDF')
    } finally {
      setExporting(false)
    }
  }

  const memoFile = useMemo(() => {
    if (!viewerBytes) return null
    return { data: viewerBytes }
  }, [viewerBytes])

  return (
    <div className="h-screen w-screen flex">
      {/* Left: Editor */}
      <div className="w-96 border-r bg-gray-50 flex-shrink-0">
        <div className="p-4 border-b">
          <div
            className="border-2 border-dashed rounded p-4 text-center text-gray-600 cursor-pointer bg-white"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('fileInput').click()}
          >
            Kéo & thả PDF vào đây hoặc click để chọn
          </div>
          <input id="fileInput" type="file" accept="application/pdf" className="hidden" onChange={e => onFileChange(e.target.files?.[0])} />
          {file && <div className="text-sm text-gray-700 mt-2">Đã chọn: {file.name}</div>}
        </div>

        <StampEditor
          stampDraft={draft}
          setStampDraft={setDraft}
          onAddStamp={addStamp}
          onClearStamps={clearStamps}
          onUndo={undo.undo}
          onRedo={undo.redo}
          canUndo={undo.canUndo}
          canRedo={undo.canRedo}
        />

        <div className="p-4 border-t">
          <button disabled={!memoFile?.data || exporting} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50" onClick={onExport}>
            {exporting ? 'Đang xuất...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Right: PDF Viewer */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 p-2 border-b bg-white">
          <span className="text-sm text-gray-600">Trang đang thao tác: {activePage + 1}</span>
          <button className="ml-auto px-2 py-1 border rounded" onClick={() => addStamp(activePage)}>Thêm Con Dấu vào trang {activePage + 1}</button>
        </div>
        <PDFViewer
          fileName={memoFileName}
          fileBytes={viewerBytes}
          stampsByPage={stampsByPage}
          onUpdateStamp={updateStamp}
          onPagesMeta={setPagesMeta}
          onSetActivePage={setActivePage}
        />
      </div>
    </div>
  )
}

