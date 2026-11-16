export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

export async function downloadChart(chart: SVGSVGElement, filename = 'calypso-co2-chart.png') {
  const copy = chart.cloneNode(true) as SVGSVGElement
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg')
  const width = chart.clientWidth
  const height = chart.clientHeight
  if (!width || !height) throw new Error('Chart is empty')
  copy.setAttribute('width', String(width))
  copy.setAttribute('height', String(height))
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml;charset=utf-8'}))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width * 2
    canvas.height = height * 2
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.fillStyle = '#111e30'
    context.fillRect(0,0,canvas.width,canvas.height)
    context.drawImage(image,0,0,canvas.width,canvas.height)
    const png = await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'))
    if (!png) throw new Error('PNG unavailable')
    download(png,filename)
  } finally { URL.revokeObjectURL(url) }
}
