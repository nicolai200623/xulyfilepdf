import React, { useEffect, useMemo, useRef, useState } from 'react'
import Draggable from 'react-draggable'

// Simple resizer handle size
const HANDLE = 10

export default function StampOverlay({
  pageIndex,
  stamp,
  onChange,
  showGuides,
}) {
  const nodeRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(null) // 'se','e','s'

  // Keep a stable element id for export rendering
  const elId = useMemo(() => stamp.elId, [stamp.elId])

  // Handlers for resize
  const onMouseDownHandle = (dir, e) => {
    e.stopPropagation()
    e.preventDefault()
    setResizing({ dir, startX: e.clientX, startY: e.clientY, startW: stamp.width, startH: stamp.height })
  }

  useEffect(() => {
    function onMove(e) {
      if (!resizing) return
      const dx = e.clientX - resizing.startX
      const dy = e.clientY - resizing.startY
      let newW = resizing.startW
      let newH = resizing.startH
      if (resizing.dir.includes('e')) newW = Math.max(80, resizing.startW + dx)
      if (resizing.dir.includes('s')) newH = Math.max(60, resizing.startH + dy)
      onChange({ ...stamp, width: newW, height: newH })
    }
    function onUp() {
      setResizing(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing, onChange, stamp])

  const rotationStyle = {
    transform: `rotate(${stamp.rotation || 0}deg)`
  }

  const contentId = `${elId}-content`

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: stamp.x, y: stamp.y }}
      bounds="parent"
      onStart={() => setDragging(true)}
      onStop={() => setDragging(false)}
      onDrag={(e, data) => onChange({ ...stamp, x: data.x, y: data.y })}
    >
      <div ref={nodeRef} className="absolute z-20" style={{ width: stamp.width, height: stamp.height }}>
        {showGuides && dragging && (
          <>
            <div className="guideline-x" style={{ top: 0 }}></div>
            <div className="guideline-y" style={{ left: 0 }}></div>
          </>
        )}
        <div id={elId} className="stamp select-none relative w-full h-full flex items-center justify-center" style={rotationStyle}>
          <div id={contentId} className="px-2 py-1" style={{ width: '100%', height: '100%' }}>
            <div className="line">{stamp.line1}</div>
            <div className="line">{stamp.line2}</div>
            <div className="line">{stamp.line3}</div>
            <div className="line">{stamp.line4}</div>
          </div>
        </div>
        {/* Resize handles */}
        <div className="absolute right-0 bottom-0 bg-red-600 cursor-se-resize" style={{ width: HANDLE, height: HANDLE }} onMouseDown={(e) => onMouseDownHandle('se', e)} />
        <div className="absolute right-0 top-1/2 -mt-1.5 bg-red-600 cursor-e-resize" style={{ width: HANDLE, height: HANDLE }} onMouseDown={(e) => onMouseDownHandle('e', e)} />
        <div className="absolute bottom-0 left-1/2 -ml-1.5 bg-red-600 cursor-s-resize" style={{ width: HANDLE, height: HANDLE }} onMouseDown={(e) => onMouseDownHandle('s', e)} />
      </div>
    </Draggable>
  )
}

