import { desc, eq } from 'drizzle-orm'
import { db } from '../../utils/db'
import { contactSubmissions, trips } from '../../database/schema'

export default defineEventHandler(() => {
  return db
    .select({
      id: contactSubmissions.id,
      name: contactSubmissions.name,
      phone: contactSubmissions.phone,
      email: contactSubmissions.email,
      message: contactSubmissions.message,
      createdAt: contactSubmissions.createdAt,
      interestedTripTitle: trips.title
    })
    .from(contactSubmissions)
    .leftJoin(trips, eq(contactSubmissions.interestedTripId, trips.id))
    .orderBy(desc(contactSubmissions.createdAt))
    .all()
})
