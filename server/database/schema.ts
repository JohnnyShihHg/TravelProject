import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const trips = sqliteTable('trips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  days: integer('days').notNull(),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  // 標題旁的狀態標籤（熱銷中／即將成團／行程已結束…），null 代表不顯示
  badge: text('badge'),
  rank: integer('rank').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
})

export const batches = sqliteTable('batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  departureDate: text('departure_date').notNull(), // ISO date
  returnDate: text('return_date').notNull(),
  flightInfo: text('flight_info'),
  meetingPoint: text('meeting_point'),
  priceInfo: text('price_info'),
  groupSize: integer('group_size'), // 成團人數
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  category: text('category', { enum: ['location', 'attraction', 'type'] }).notNull()
})

export const tripTags = sqliteTable('trip_tags', {
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
})

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  r2Key: text('r2_key').notNull(),
  url: text('url').notNull(), // local: placeholder url, prod: r2 public url
  category: text('category'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})

export const tripImages = sqliteTable('trip_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  isCover: integer('is_cover', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0)
})

export const CONTENT_BLOCK_TYPES = ['richtext', 'highlights', 'flight', 'daily_itinerary'] as const
export type ContentBlockType = typeof CONTENT_BLOCK_TYPES[number]

export const contentBlocks = sqliteTable('content_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  type: text('type', { enum: CONTENT_BLOCK_TYPES }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  data: text('data').notNull(), // JSON, shape depends on type
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})

export const contentSnippets = sqliteTable('content_snippets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: CONTENT_BLOCK_TYPES }).notNull(),
  data: text('data').notNull(), // JSON, same shape as content_blocks.data for this type
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})

export const heroContent = sqliteTable('hero_content', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  imageUrl: text('image_url').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
})

export const contactSubmissions = sqliteTable('contact_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  interestedTripId: integer('interested_trip_id').references(() => trips.id, { onDelete: 'set null' }),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})
