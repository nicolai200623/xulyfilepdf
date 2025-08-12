import React from 'react'

export default function StampEditor({
  stampDraft,
  setStampDraft,
  onAddStamp,
  onClearStamps,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  numPages = 0,
  hasFile = false,
}) {
  const onChange = (key, value) => setStampDraft(prev => ({ ...prev, [key]: value }))
  const [pageInput, setPageInput] = React.useState('1')

  const addToChosenPage = () => {
    if (!hasFile) return
    let p = parseInt(pageInput, 10)
    if (!Number.isFinite(p) || p < 1) p = 1
    if (numPages > 0) p = Math.min(Math.max(p, 1), numPages)
    onAddStamp(p - 1)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Con Dấu/Stamp</h2>

      <div className="space-y-2">
        <label className="block text-sm">Dòng 1</label>
        <input className="w-full border rounded px-2 py-1" value={stampDraft.line1} onChange={e => onChange('line1', e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Dòng 2</label>
        <input className="w-full border rounded px-2 py-1" value={stampDraft.line2} onChange={e => onChange('line2', e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Dòng 3</label>
        <input className="w-full border rounded px-2 py-1" value={stampDraft.line3} onChange={e => onChange('line3', e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Dòng 4</label>
        <input className="w-full border rounded px-2 py-1" value={stampDraft.line4} onChange={e => onChange('line4', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm">Rộng (px)</label>
          <input type="number" className="w-full border rounded px-2 py-1" value={stampDraft.width} onChange={e => onChange('width', parseInt(e.target.value||'0',10))} />
        </div>
        <div>
          <label className="block text-sm">Cao (px)</label>
          <input type="number" className="w-full border rounded px-2 py-1" value={stampDraft.height} onChange={e => onChange('height', parseInt(e.target.value||'0',10))} />
        </div>
        <div>
          <label className="block text-sm">Xoay (độ)</label>
          <input type="number" className="w-full border rounded px-2 py-1" value={stampDraft.rotation} onChange={e => onChange('rotation', parseInt(e.target.value||'0',10))} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <div className="flex items-center gap-2">
          <label className="text-sm whitespace-nowrap" htmlFor="pageNumber">Trang:</label>
          <input
            id="pageNumber"
            type="number"
            min={1}
            max={numPages || undefined}
            className="w-20 border rounded px-2 py-1"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder="1"
            disabled={!hasFile}
          />
          <button
            className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50 hover:bg-red-700"
            title="Thêm con dấu vào trang đã nhập"
            disabled={!hasFile}
            onClick={addToChosenPage}
          >
            + Thêm vào trang
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="bg-gray-200 px-3 py-1 rounded" onClick={onClearStamps}>Xoá tất cả</button>
          <button className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled={!canUndo} onClick={onUndo}>Undo</button>
          <button className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled={!canRedo} onClick={onRedo}>Redo</button>
        </div>
      </div>

      <div className="pt-4">
        <div className="text-sm text-gray-600 mb-2">Preview:</div>
        <div className="stamp inline-block" style={{ width: stampDraft.width, height: stampDraft.height }}>
          <div className="line">{stampDraft.line1}</div>
          <div className="line">{stampDraft.line2}</div>
          <div className="line">{stampDraft.line3}</div>
          <div className="line">{stampDraft.line4}</div>
        </div>
      </div>
    </div>
  )
}

