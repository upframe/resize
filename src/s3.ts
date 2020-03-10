import axios from 'axios'
import { S3 } from 'aws-sdk'

const s3 = new S3({
  accessKeyId: process.env.AWS_KEY_ID,
  secretAccessKey: process.env.AWS_KEY_SECRET,
})

const bucketUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.BUCKET_REGION}.amazonaws.com/`

export const download = (path: string): Promise<Buffer> =>
  axios({
    method: 'get',
    url: bucketUrl + path,
    responseType: 'arraybuffer',
    timeout: 10000,
  }).then(({ data }) => data)

export const upload = async (name: string, data: Buffer) =>
  await s3
    .upload({
      Bucket: process.env.BUCKET_NAME,
      Key: `res-v2/${name}`,
      Body: data,
      ACL: 'public-read',
    })
    .promise()

export const getUrl = (key: string) => `${bucketUrl}res-v2/${key}`
