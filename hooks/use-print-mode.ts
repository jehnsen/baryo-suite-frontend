"use client"

import { useCallback, useEffect, useState } from "react"
import { flushSync } from "react-dom"

/**
 * Mounts print-only content just before the browser prints (button or
 * Ctrl/Cmd+P) and unmounts it afterwards, so large print layouts are not kept
 * in the DOM while browsing.
 */
export function usePrintMode() {
  const [printing, setPrinting] = useState(false)
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true))
    const after = () => setPrinting(false)
    window.addEventListener("beforeprint", before)
    window.addEventListener("afterprint", after)
    return () => {
      window.removeEventListener("beforeprint", before)
      window.removeEventListener("afterprint", after)
    }
  }, [])
  const print = useCallback(() => {
    flushSync(() => setPrinting(true))
    window.print()
  }, [])
  return { printing, print }
}
