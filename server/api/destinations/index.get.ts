import { getDB } from '../../utils/db'
import { listDestinations } from '../../utils/places'

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const query = getQuery(event)
  const type = typeof query.type === 'string' ? query.type : ''

  const items = await listDestinations(db)
  if (type === 'country' || type === 'city') return items.filter(d => d.type === type)
  return items
})
