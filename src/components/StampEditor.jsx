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
}) {
  const onChange = (key, value) => setStampDraft(prev => ({ ...prev, [key]: value }))

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
        <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={onAddStamp}>Thêm Con Dấu</button>
        <button className="bg-gray-200 px-3 py-1 rounded" onClick={onClearStamps}>Xoá tất cả</button>
        <button className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled={!canUndo} onClick={onUndo}>Undo</button>
        <button className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled={!canRedo} onClick={onRedo}>Redo</button>
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

