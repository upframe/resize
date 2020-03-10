import processImg from './resize'

export const resize = async ({ Records, path, body }, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  if (path?.replace(/^\/|\/$/g, '') === 'resize') {
    const paths = JSON.parse(body)?.imgs
    if (!Array.isArray(paths)) return
    await processImg(...paths)
  } else if (Records.length) {
    if (process.env.stage !== 'prod')
      return void console.log(
        `ignoring event because stage is ${process.env.stage}`
      )
    const added = Records.filter(
      ({ eventName }) => eventName === 'ObjectCreated:Put'
    )
      .map(({ s3 }) => s3.object.key)
      .filter(key => /^\/?[^/]+\/?$/.test(key))
    if (added.length) await processImg(...added)
  }
}
