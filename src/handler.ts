import processImg from './resize'
import wrap from './utils/handler'
import handleTask, { Task } from './task'
import type { S3Event } from 'aws-lambda'
import type * as AWS from 'aws-lambda'

export const resize = wrap<S3Event>(async (db, { Records }) => {
  const added = Records.filter(
    ({ eventName }) => eventName === 'ObjectCreated:Put'
  )
    .map(({ s3 }) => s3.object.key)
    .filter(key => /^\/?[^/]+\/?$/.test(key))

  if (!added.length) return

  await processImg(db, ...added)
})

export const transform = wrap<AWS.APIGatewayEvent | AWS.SNSEvent>(
  async (db, event) => {
    if (!('Records' in event)) {
      const headers = Object.fromEntries(
        Object.entries(event.headers).map(([k, v]) => [k.toLowerCase(), v])
      )
      if (!process.env.IMG_SECRET || headers.auth !== process.env.IMG_SECRET)
        throw 401
    }

    const tasks: Task[] =
      'body' in event
        ? JSON.parse(event.body)
        : event.Records.map(({ Sns }) => JSON.parse(Sns.Message))

    if (!Array.isArray(tasks)) throw Error('body must be array of tasks')

    const results = await Promise.allSettled(
      tasks.map(task => handleTask(task, db))
    )

    results.forEach((res, i) => {
      if (res.status === 'rejected') {
        console.error(res.reason)
        throw Error(`task ${i} failed (${res.reason})`)
      }
    })
  }
)
