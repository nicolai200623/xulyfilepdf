import html2canvas from 'html2canvas'
import { PDFDocument, degrees } from 'pdf-lib'

// Render element reliably by cloning it to a detached, fixed container to avoid transform/overflow issues
async function renderStampToDataURL(el, options = {}) {
  const { width, height, scale = 3 } = options

  // Clone element with styles
  const clone = el.cloneNode(true)

  // Container to render offscreen
  const wrapper = document.createElement('div')
  wrapper.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: ${width}px;
    height: ${height}px;
    pointer-events: none;
    overflow: visible;
    background: transparent;
  `

  // Reset transform and sizing on clone
  clone.style.position = 'relative'
  clone.style.transform = 'none'
  clone.style.width = '100%'
  clone.style.height = '100%'

  // Copy important computed styles
  try {
    const originalStyles = window.getComputedStyle(el)
    const importantStyles = ['border', 'color', 'background', 'font-family', 'font-weight', 'text-align', 'padding']
    importantStyles.forEach(prop => {
      clone.style[prop] = originalStyles.getPropertyValue(prop)
    })
  } catch {}

  // Ensure class names preserved
  clone.className = el.className

  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  // Wait for render paint
  await new Promise(r => setTimeout(r, 100))

  // Create canvas with willReadFrequently hint
  const canvasEl = document.createElement('canvas')
  canvasEl.width = Math.max(1, Math.floor(width * scale))
  canvasEl.height = Math.max(1, Math.floor(height * scale))
  try { canvasEl.getContext('2d', { willReadFrequently: true }) } catch {}

  try {
    const canvas = await html2canvas(wrapper, {
      scale,
      // Preserve transparency on the rendered stamp
      backgroundColor: null,
      useCORS: true,
      logging: false,
      width: width,
      height: height,
      windowWidth: width,
      windowHeight: height,
      allowTaint: true,
      foreignObjectRendering: false,
      canvas: canvasEl,
      removeContainer: true,
    })
    return canvas.toDataURL('image/png')
  } finally {
    document.body.removeChild(wrapper)
  }
}

function toUint8Array(input) {
  if (!input) throw new Error('No PDF bytes provided')
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (input.buffer && input.byteLength !== undefined) {
    return new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength)
  }
  throw new Error('Unsupported PDF input type')
}

function dataUrlToUint8Array(dataUrl) {
  if (typeof dataUrl !== 'string') throw new Error('Expected data URL string')
  const comma = dataUrl.indexOf(',')
  const base64 = dataUrl.slice(comma + 1)
  const bin = atob(base64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// Export stamped PDF
// params:
// - fileArrayBuffer: original PDF bytes (Uint8Array | ArrayBuffer)
// - pagesMeta: { [pageIndex]: { width, height, scale } } from viewer (CSS sizes)
// - stampsByPage: { [pageIndex]: Array<{ id, x, y, width, height, rotation, elId }> }
//    where x,y,width,height are in CSS pixels of the rendered page container.
export async function exportStampedPDF({ fileArrayBuffer, pagesMeta, stampsByPage }) {
  // Normalize bytes
  const pdfBytes = toUint8Array(fileArrayBuffer)

  const srcPdf = await PDFDocument.load(pdfBytes)
  const outPdf = await PDFDocument.create()

  // Copy pages to preserve original content and size
  const copiedPages = await outPdf.copyPages(srcPdf, srcPdf.getPageIndices())
  for (let i = 0; i < copiedPages.length; i++) {
    outPdf.addPage(copiedPages[i])
  }

  // Helper to get CSS render size and offset from DOM if meta missing
  function getCssPageMetricsFromDom(idx) {
    try {
      const wrapper = document.querySelector(`[data-page-wrapper][data-page-index="${idx}"]`)
      if (!wrapper) return null
      const rect = wrapper.getBoundingClientRect()
      return { width: rect.width, height: rect.height, left: rect.left + window.scrollX, top: rect.top + window.scrollY }
    } catch {}
    return null
  }

  // Debug logs
  console.log('Starting export with stamps:', stampsByPage)
  console.log('Pages meta:', pagesMeta)

  // Now draw stamps using real PDF page sizes (points)
  for (let pageIndex = 0; pageIndex < outPdf.getPageCount(); pageIndex++) {
    const page = outPdf.getPage(pageIndex)
    const pdfW = page.getWidth()
    const pdfH = page.getHeight()

    let cssW, cssH
    const meta = pagesMeta[pageIndex]
    if (meta && meta.width && meta.height) {
      cssW = meta.width
      cssH = meta.height
    } else {
      const domMetrics = getCssPageMetricsFromDom(pageIndex)
      cssW = (domMetrics && domMetrics.width) || pdfW
      cssH = (domMetrics && domMetrics.height) || pdfH
    }

    const sx = pdfW / cssW
    const sy = pdfH / cssH

    const stamps = (stampsByPage[pageIndex] || [])
    for (const stamp of stamps) {
      // Find element by ID with fallback to content
      let el = document.getElementById(stamp.elId)
      if (!el) el = document.getElementById(`${stamp.elId}-content`)
      if (!el) {
        console.warn('Stamp element not found:', stamp.elId)
        continue
      }

      // Measure live position and size relative to page wrapper to avoid state drift
      const domMetrics = getCssPageMetricsFromDom(pageIndex)
      if (!domMetrics) {
        console.warn('Page DOM metrics missing; skipping stamp', stamp.id)
        continue
      }
      const pageLeft = domMetrics.left
      const pageTop = domMetrics.top

      // Use the absolute-positioned container (parent of stamp el) for coordinates (not affected by inner rotation)
      const containerEl = el.parentElement || el
      const containerRect = containerEl.getBoundingClientRect()
      const relX = (containerRect.left + window.scrollX) - pageLeft
      const relY = (containerRect.top + window.scrollY) - pageTop

      // Use container box size (the configured stamp width/height)
      const elW = Math.max(1, Math.round(containerRect.width))
      const elH = Math.max(1, Math.round(containerRect.height))

      // Clamp within page bounds to avoid off-page draw
      const clamp = (val, min, max) => Math.min(Math.max(val, min), max)
      const clampedX = clamp(relX, 0, cssW - elW)
      const clampedY = clamp(relY, 0, cssH - elH)

      console.log(`Processing stamp ${stamp.id} on page ${pageIndex}:`, {
        position: { x: clampedX, y: clampedY },
        size: { width: elW, height: elH },
        rotation: stamp.rotation,
        cssPage: { cssW, cssH }, pdfPage: { pdfW, pdfH }, scale: { sx, sy },
        raw: { relX, relY }
      })

      // Capture with measured size (capture inner stamp element to keep styles)
      const dataUrl = await renderStampToDataURL(el, {
        width: elW,
        height: elH,
        scale: 3,
      })

      if (!dataUrl || dataUrl === 'data:,') {
        console.error('Failed to capture stamp:', stamp.elId)
        continue
      }

      const pngBytes = dataUrlToUint8Array(dataUrl)
      const png = await outPdf.embedPng(pngBytes)

      // CSS -> PDF mapping (invert Y) using container origin
      const xPt = clampedX * sx
      const yPt = pdfH - ((clampedY + elH) * sy)
      const wPt = elW * sx
      const hPt = elH * sy

      page.drawImage(png, {
        x: xPt,
        y: yPt,
        width: wPt,
        height: hPt,
        rotate: stamp.rotation ? degrees(stamp.rotation) : degrees(0),
        opacity: 1,
      })
    }
  }

  const bytes = await outPdf.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

