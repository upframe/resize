import { download, upload } from './s3'
import fs from 'fs'
import path from 'path'
import sharp, { OutputInfo, Sharp } from 'sharp'

export type Task = {
  input: string
  outputs: Output[]
  crop?: Crop
  resize?: Resize[]
  formats: Format[]
}

type Output = {
  bucket: string
  key: string
}

type Crop = {
  width: number
  ratio: number
  left?: number
  top?: number
  absolute?: boolean
}

type Resize = { width?: number; height?: number }

type Format = 'png' | 'jpeg' | 'webp'

export default async function ({ input, outputs, ...ops }: Task) {
  if (!outputs?.length) throw 'no outputs specified'

  const raw = await download(input, true)
  let img = sharp(raw)

  if (ops.crop) await crop(img, ops.crop)

  let out: Sharp[] = []

  if (ops.resize?.length) out = ops.resize.map(v => resize(img.clone(), v))

  if (ops.formats?.length)
    out = out.flatMap(img => ops.formats.map(f => format(img.clone(), f)))

  if (!out.length) out = [img]
  const res = await Promise.allSettled(
    out.flatMap(v =>
      v.toBuffer((err, data, info) =>
        outputs.map(output => writeOutput(output, data, info))
      )
    )
  )

  for (const v of res) if (v.status === 'rejected') throw v.reason
}

async function crop(img: Sharp, params: Crop) {
  const meta = await img.metadata()
  const width = params.absolute ? params.width : meta.width * params.width
  const height = width * params.ratio
  img = img.extract({
    left: Math.round((params.left ?? 0) * (params.absolute ? 1 : meta.width)),
    top: Math.round((params.top ?? 0) * (params.absolute ? 1 : meta.height)),
    width,
    height,
  })
}

function resize(img: Sharp, params: Resize) {
  if ('width' in params === 'height' in params)
    throw 'must specify either width or height for resizing'

  return img.resize(params.width, params.height, {
    kernel: sharp.kernel.lanczos3,
    withoutEnlargement: true,
  })
}

function format(img: Sharp, format: Format) {
  switch (format) {
    case 'png':
      return img.png()
    case 'jpeg':
      return img.jpeg({ progressive: true })
    case 'webp':
      return img.webp()
    default:
      throw `unknown format type ${format}`
  }
}

async function writeOutput(
  { bucket, key }: Output,
  data: Buffer,
  meta: OutputInfo
) {
  key = key.replace(
    /\$\{\s*([\w]+)\s*\}/g,
    (_, k) => meta[k] ?? (console.warn(`unknown meta property ${k}`), k)
  )
  if (bucket) await upload(key, data, bucket)
  else {
    if (!process.env.IS_OFFLINE) throw `must specify bucket for ${key}`
    writeFile(`output/${key}`, data)
  }
}

function writeFile(key: string, data: Buffer) {
  const dir = path.dirname(key)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(key, data)
}
