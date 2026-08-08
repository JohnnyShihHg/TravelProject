import { ensureSchema } from '../utils/db'
import { seed } from '../database/seed'

export default defineNitroPlugin(() => {
  ensureSchema()
  seed()
})
