import processImg from './resize'
import wrap from './utils/handler'
import handleTask, { Task } from './task'

export const resize = async ({ Records, path, body }, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  let added: string[] = []

  if (path?.replace(/^\/|\/$/g, '') === 'resize') {
    const paths = JSON.parse(body)?.imgs
    if (Array.isArray(paths)) added = paths
  } else if (Records.length) {
    if (process.env.stage !== 'prod')
      return void console.log(
        `ignoring event because stage is ${process.env.stage}`
      )
    added = Records.filter(({ eventName }) => eventName === 'ObjectCreated:Put')
      .map(({ s3 }) => s3.object.key)
      .filter(key => /^\/?[^/]+\/?$/.test(key))
  }
  if (added.length) await processImg(...added)
}

export const transform = wrap(async event => {
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

  const results = await Promise.allSettled(tasks.map(handleTask))

  results.forEach((res, i) => {
    if (res.status === 'rejected') {
      console.error(res.reason)
      throw Error(`task ${i} failed (${res.reason})`)
    }
  })
})
