import { download, upload } from './s3'
import sharp from 'sharp'

export default async function(...imgs) {
  console.log(`process ${imgs.join(', ')}`)
  await Promise.all(imgs.map(img => process(img, imgs.length)))
}

async function process(img: string, total: number) {
  let data: Buffer
  try {
    data = await download(img)
    console.log(`downloaded ${count('download')}/${total}`)
  } catch (e) {
    return console.warn(`couldn't download ${img}`)
  }
  let processed: { img: Promise<Buffer>; size: number; format: string }[]
  try {
    processed = await resize(data)
    await Promise.all(
      processed
        .map(({ img: data, size, format }) => ({
          name: `${img.replace(/^(.+)\.\w+$/, '$1')}-${size}.${format}`,
          data,
        }))
        .map(({ name, data }) =>
          data
            .catch(() => `couldn't resize ${name}`)
            .then((data: Buffer) => upload(`${name}`, data))
            .catch(({ message }) =>
              console.warn(`couldn't upload ${name} (${message})`)
            )
        )
    )
    console.log(`uploaded ${count('upload')}/${total}`)
  } catch (e) {
    console.log(e)
    return console.warn(`couldn't resize ${img}`)
  }
}

const counters = {}
function count(name) {
  if (!(name in counters)) counters[name] = 0
  return ++counters[name]
}

export const resize = async (
  data: Buffer,
  sizes = [128, 256, 512, 1024],
  formats = ['jpeg', 'webp']
) => {
  const img = sharp(data)
  const meta = await img.metadata()

  const imgSize = Math.min(meta.width, meta.height)
  if (Math.max(...sizes) > imgSize)
    sizes = [...sizes.filter(size => size < imgSize), imgSize]

  const sized = sizes.map(size => ({
    img: img.clone().resize(size, size, {
      fit: 'cover',
      kernel: sharp.kernel.lanczos3,
    }),
    size,
  }))

  return formats.flatMap(format =>
    sized.map(({ img: raw, size }) => ({
      size,
      format,
      img: (meta.format === format ? raw : raw[format]()).toBuffer(),
    }))
  )
}
