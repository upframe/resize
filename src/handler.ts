import process from './resize'

export const resize = async ({ Records, path, body }) => {
  if (path.replace(/^\/|\/$/g, '') === 'resize') {
    const paths = JSON.parse(body)?.imgs
    if (!Array.isArray(paths)) return
    await process(...paths)
  } else if (Records.length) {
    const added = Records.filter(
      ({ eventName }) => eventName === 'ObjectCreated:Put'
    )
      .map(({ s3 }) => s3.object.key)
      .filter(key => /^\/?[^/]+\/?$/.test(key))
    if (added.length) await process(...added)
  }
}
