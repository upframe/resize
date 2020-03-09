import process from './resize'

export const resize = async ({ Records, path, body }) => {
  if (path.replace(/^\/|\/$/g, '') === 'resize') {
    const paths = JSON.parse(body)?.imgs
    if (!Array.isArray(paths)) return
    await process(...paths)
  }
}
