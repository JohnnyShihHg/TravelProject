import { getCloudflareMediaEnv, readLocalUpload } from '../../utils/media'

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')
  if (!key) throw createError({ statusCode: 400, statusMessage: 'Missing key' })

  const cf = getCloudflareMediaEnv(event)

  if (cf) {
    const object = await cf.bucket.get(key)
    if (!object) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    setResponseHeader(event, 'content-type', object.httpMetadata?.contentType || 'application/octet-stream')
    setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
    return object.body
  }

  const local = await readLocalUpload(key)
  if (!local) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  setResponseHeader(event, 'content-type', local.contentType)
  setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return local.data
})
