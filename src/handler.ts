import axios from 'axios'
import { S3 } from 'aws-sdk'

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
  return download(bucketUrl + path).then(img => upload(`resized/${path}`, img))
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
