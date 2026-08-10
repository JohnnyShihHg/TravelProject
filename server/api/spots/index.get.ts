import { getDB } from '../../utils/db'
import { listSpots } from '../../utils/places'

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  return listSpots(db)
})
