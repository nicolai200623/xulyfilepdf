import { useCallback, useRef, useState } from 'react'

// Simple undo/redo stack for arrays of items (e.g., stamps)
export default function useUndoRedo(initial) {
  const past = useRef([])
  const future = useRef([])
  const [present, setPresent] = useState(initial)

  const set = useCallback((next) => {
    past.current.push(present)
    future.current = []
    setPresent(next)
  }, [present])

  const undo = useCallback(() => {
    if (past.current.length === 0) return
    const prev = past.current.pop()
    future.current.push(present)
    setPresent(prev)
  }, [present])

  const redo = useCallback(() => {
    if (future.current.length === 0) return
    const next = future.current.pop()
    past.current.push(present)
    setPresent(next)
  }, [present])

  const canUndo = past.current.length > 0
  const canRedo = future.current.length > 0

  return { state: present, set, undo, redo, canUndo, canRedo }
}

