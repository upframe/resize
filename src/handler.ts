import axios from 'axios'
import { S3 } from 'aws-sdk'
import sharp from 'sharp'

const s3 = new S3()
const bucketUrl = `https://${process.env.BUCKET_NAME}.s3.eu-west-2.amazonaws.com/`

export const resize = async ({ Records }) => {
  const imgPaths = Records.filter(
    ({ eventName }) => eventName === 'ObjectCreated:Put'
  )
    .map(({ s3 }) => s3.object.key)
    .filter(key => !key.endsWith('/') && !key.startsWith('resized/'))

  try {
    await Promise.all(imgPaths.map(processImage))
  } catch (e) {
    console.warn(e)
  }
}

async function processImage(path: string) {
  const img = await download(bucketUrl + path)
  await Promise.all(
    (await Promise.all(await resizeImg(img))).map(({ img, size, format }) =>
      upload(`resized/${path.split('.').shift()}-${size}.${format}`, img)
    )
  )
}

const download = (url: string): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    axios({
      method: 'get',
      url,
      responseType: 'arraybuffer',
      timeout: 10000,
    })
      .then(({ data }) => resolve(data))
      .catch(err => {
        console.log(`error while downloading ${url}`)
        reject(err)
      })
  )

function upload(name: string, data: Buffer): Promise<void> {
  return new Promise((resolve: () => void, reject) => {
    s3.upload({
      Bucket: process.env.BUCKET_NAME,
      Key: name,
      Body: data,
      ACL: 'public-read',
    })
      .promise()
      .then(resolve)
      .catch(err => {
        console.log(`error uploading ${name}`)
        reject(err)
      })
  })
}

export const resizeImg = async (data: Buffer, sizes = [200, 500]) => {
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

  return ['jpeg', 'webp'].flatMap(format =>
    sized.map(({ img: raw, size }) =>
      (meta.format === format ? raw : raw[format]())
        .toBuffer()
        .then(img => ({ img, size, format }))
    )
  )
}
