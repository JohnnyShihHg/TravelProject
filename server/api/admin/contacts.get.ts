import { desc, eq } from 'drizzle-orm'
import { getDB } from '../../utils/db'
import { contactSubmissions, trips } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  return db
    .select({
      id: contactSubmissions.id,
      name: contactSubmissions.name,
      phone: contactSubmissions.phone,
      email: contactSubmissions.email,
      message: contactSubmissions.message,
      isRead: contactSubmissions.isRead,
      createdAt: contactSubmissions.createdAt,
      interestedTripTitle: trips.title
    })
    .from(contactSubmissions)
    .leftJoin(trips, eq(contactSubmissions.interestedTripId, trips.id))
    .orderBy(desc(contactSubmissions.createdAt))
    .all()
})
