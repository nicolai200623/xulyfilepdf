import html2canvas from 'html2canvas'
import { PDFDocument, degrees } from 'pdf-lib'

// Render element reliably by cloning it to a detached, fixed container to avoid transform/overflow issues
async function renderStampToDataURL(el, { width, height, scale = 3 }) {
  // Clone target
  const clone = el.cloneNode(true)
  // Container to isolate layout
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-10000px'
  wrapper.style.top = '0'
  wrapper.style.width = `${width}px`
  wrapper.style.height = `${height}px`
  wrapper.style.pointerEvents = 'none'
  wrapper.style.transform = 'none'
  wrapper.style.contain = 'strict'
  clone.style.transform = 'none'
  clone.style.width = '100%'
  clone.style.height = '100%'
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  // Wait next frame to ensure styles applied
  await new Promise(r => requestAnimationFrame(r))

  // Pre-create canvas with willReadFrequently to address Canvas2D warning
  const canvasEl = document.createElement('canvas')
  canvasEl.width = Math.max(1, Math.floor(width * scale))
  canvasEl.height = Math.max(1, Math.floor(height * scale))
  // Initialize context with hint; ignore return since html2canvas will draw on provided canvas
  try { canvasEl.getContext('2d', { willReadFrequently: true }) } catch {}

  const canvas = await html2canvas(wrapper, {
    scale,
    backgroundColor: null,
    useCORS: true,
    logging: false,
    canvas: canvasEl,
    // Prefer CORS images if any
    allowTaint: false,
    removeContainer: true,
  })

  const dataUrl = canvas.toDataURL('image/png')
  document.body.removeChild(wrapper)
  return dataUrl
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

  // Helper to get CSS render size from DOM if meta missing
  function getCssPageSizeFromDom(idx) {
    try {
      const wrapper = document.querySelector(`[data-page-wrapper][data-page-index="${idx}"]`)
      if (!wrapper) return null
      // react-pdf renders canvas or svg inside
      const canvas = wrapper.querySelector('canvas')
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      }
      const svg = wrapper.querySelector('svg')
      if (svg) {
        const rect = svg.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      }
    } catch {}
    return null
  }

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
      const domSize = getCssPageSizeFromDom(pageIndex)
      cssW = (domSize && domSize.width) || pdfW
      cssH = (domSize && domSize.height) || pdfH
    }

    const sx = pdfW / cssW
    const sy = pdfH / cssH

    const stamps = (stampsByPage[pageIndex] || [])
    for (const stamp of stamps) {
      const el = document.getElementById(stamp.elId)
      const contentEl = document.getElementById(`${stamp.elId}-content`)
      const target = el || contentEl
      if (!target) {
        console.warn('Stamp element not found for export', stamp.elId)
        continue
      }

      // Ensure the element is visible and rendered for html2canvas
      target.style.transformOrigin = 'top left'

      // First try to capture the whole stamp node
      let dataUrl = await renderStampToDataURL(target, 3)
      if (!dataUrl || dataUrl.length < 200) {
        // Fallback: try capturing inner content if image seemed empty/suspicious
        if (contentEl && contentEl !== target) {
          dataUrl = await renderStampToDataURL(contentEl, 3)
        }
      }
      if (!dataUrl || dataUrl.length < 200) {
        console.warn('Failed to capture stamp image (empty dataUrl)', stamp.elId)
        continue
      }

      const pngBytes = dataUrlToUint8Array(dataUrl)
      const png = await outPdf.embedPng(pngBytes)

      // Map CSS coordinates to PDF points; invert Y axis
      const xPt = stamp.x * sx
      const yBottomCss = stamp.y + stamp.height
      const yPt = (cssH - yBottomCss) * sy

      const wPt = stamp.width * sx
      const hPt = stamp.height * sy

      const rotation = stamp.rotation || 0

      page.drawImage(png, {
        x: xPt,
        y: yPt,
        width: wPt,
        height: hPt,
        rotate: rotation ? degrees(rotation) : undefined,
        opacity: 1,
      })
    }
  }

  const bytes = await outPdf.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

