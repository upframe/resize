import { download, upload } from './s3'
import fs from 'fs'
import path from 'path'

export type Task = {
  input: string
  outputs: Output[]
}

type Output = {
  bucket: string
  key: string
}

export default async function (task: Task) {
  if (!task.outputs?.length) throw 'no outputs specified'

  const file = await download(task.input, true)

  const writeOutput = async ({ bucket, key }: Output, data: Buffer) => {
    if (bucket) await upload(key, data, bucket)
    else {
      if (!process.env.IS_OFFLINE) throw `must specify bucket for ${key}`
      writeFile(`output/${key}`, data)
    }
  }

  const files = [file]

  const res = await Promise.allSettled(
    files.flatMap((data) =>
      task.outputs.map((output) => writeOutput(output, data))
    )
  )

  for (const v of res) if (v.status === 'rejected') throw v.reason
}

function writeFile(key: string, data: Buffer) {
  const dir = path.dirname(key)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(key, data)
}
