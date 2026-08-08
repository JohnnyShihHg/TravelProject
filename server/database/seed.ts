import { db } from '../utils/db'
import { trips, batches, tags, tripTags, media, tripImages, contactSubmissions, heroContent } from './schema'
import { eq } from 'drizzle-orm'

function placeholderImage(seed: string, w = 1200, h = 800) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`
}

const TAGS: { name: string, category: 'location' | 'attraction' | 'type' }[] = [
  { name: '日本', category: 'location' },
  { name: '東京', category: 'location' },
  { name: '京都', category: 'location' },
  { name: '北海道', category: 'location' },
  { name: '韓國', category: 'location' },
  { name: '台灣', category: 'location' },
  { name: '富士山', category: 'attraction' },
  { name: '清水寺', category: 'attraction' },
  { name: '101', category: 'attraction' },
  { name: '賞花', category: 'type' },
  { name: '賞楓', category: 'type' },
  { name: '美食', category: 'type' },
  { name: '親子', category: 'type' },
  { name: '深度旅遊', category: 'type' },
  { name: '溫泉', category: 'type' }
]

const TRIPS = [
  {
    slug: 'tokyo-sakura-5days',
    title: '東京櫻花五日：新宿、上野、河口湖賞櫻深度之旅',
    summary: '三月底四月初櫻花季限定，走訪新宿御苑、上野公園、河口湖，近距離眺望富士山與盛開櫻花。',
    days: 5,
    status: 'published' as const,
    isFeatured: true,
    rank: 1,
    tagNames: ['日本', '東京', '富士山', '賞花'],
    content: `<h2>行程亮點</h2><p>本行程專為賞櫻旺季規劃，避開人潮擁擠的熱門時段，安排新宿御苑、上野公園兩大都心賞櫻名所，並前往河口湖眺望富士山與湖畔櫻花並列的經典畫面。</p><h2>每日行程</h2><p><strong>Day 1</strong>：桃園機場 → 東京成田機場 → 入住新宿飯店</p><p><strong>Day 2</strong>：新宿御苑賞櫻 → 明治神宮 → 表參道自由活動</p><p><strong>Day 3</strong>：河口湖畔賞櫻 → 富士山展望 → 溫泉飯店住宿</p><p><strong>Day 4</strong>：上野公園賞櫻 → 淺草寺 → 台場自由活動</p><p><strong>Day 5</strong>：成田機場 → 桃園機場</p>`,
    batches: [
      { departureDate: '2027-03-25', returnDate: '2027-03-29', flightInfo: 'CI 桃園-成田 直飛', meetingPoint: '桃園機場第二航廈', priceInfo: 'NT$ 42,900 起', groupSize: 20 },
      { departureDate: '2027-04-01', returnDate: '2027-04-05', flightInfo: 'BR 桃園-成田 直飛', meetingPoint: '桃園機場第一航廈', priceInfo: 'NT$ 45,900 起', groupSize: 20 }
    ]
  },
  {
    slug: 'kyoto-autumn-6days',
    title: '京都賞楓六日：清水寺、嵐山、伏見稻荷古都巡禮',
    summary: '十一月楓紅正盛，深度走訪清水寺、嵐山竹林、伏見稻荷千本鳥居，體驗古都秋日風情。',
    days: 6,
    status: 'published' as const,
    isFeatured: true,
    rank: 2,
    tagNames: ['日本', '京都', '清水寺', '賞楓', '深度旅遊'],
    content: `<h2>行程亮點</h2><p>京都是日本賞楓最具代表性的城市，本行程安排六天五夜深度停留，避開走馬看花的緊湊行程，讓旅客有充分時間感受古都氛圍。</p><h2>每日行程</h2><p><strong>Day 1</strong>：桃園機場 → 大阪關西機場 → 京都入住</p><p><strong>Day 2</strong>：清水寺 → 二年坂三年坂 → 祇園花見小路</p><p><strong>Day 3</strong>：嵐山竹林小徑 → 渡月橋 → 天龍寺</p><p><strong>Day 4</strong>：伏見稻荷大社千本鳥居 → 東福寺賞楓</p><p><strong>Day 5</strong>：奈良公園 → 東大寺 → 大阪心齋橋自由活動</p><p><strong>Day 6</strong>：大阪關西機場 → 桃園機場</p>`,
    batches: [
      { departureDate: '2026-11-14', returnDate: '2026-11-19', flightInfo: 'JX 桃園-關西 直飛', meetingPoint: '桃園機場第一航廈', priceInfo: 'NT$ 52,900 起', groupSize: 16 },
      { departureDate: '2026-11-21', returnDate: '2026-11-26', flightInfo: 'CI 桃園-關西 直飛', meetingPoint: '桃園機場第二航廈', priceInfo: 'NT$ 54,900 起', groupSize: 16 }
    ]
  },
  {
    slug: 'hokkaido-onsen-5days',
    title: '北海道溫泉美食五日：登別、小樽、札幌雪國饗宴',
    summary: '冬季限定，登別地獄谷溫泉、小樽運河、札幌湯咖哩與海鮮市場，暖心暖胃的北國之旅。',
    days: 5,
    status: 'published' as const,
    isFeatured: false,
    rank: 3,
    tagNames: ['日本', '北海道', '溫泉', '美食'],
    content: `<h2>行程亮點</h2><p>寒冬中最療癒的旅程，安排連續兩晚溫泉飯店住宿，並深度品嚐北海道在地美食，包含湯咖哩、成吉思汗烤肉與二條市場現撈海鮮。</p><h2>每日行程</h2><p><strong>Day 1</strong>：桃園機場 → 新千歲機場 → 登別溫泉</p><p><strong>Day 2</strong>：登別地獄谷 → 熊牧場 → 洞爺湖溫泉</p><p><strong>Day 3</strong>：小樽運河 → 音樂盒博物館 → 札幌市區</p><p><strong>Day 4</strong>：白色戀人公園 → 二條市場 → 狸小路自由活動</p><p><strong>Day 5</strong>：新千歲機場 → 桃園機場</p>`,
    batches: [
      { departureDate: '2027-01-10', returnDate: '2027-01-14', flightInfo: 'CI 桃園-新千歲 直飛', meetingPoint: '桃園機場第二航廈', priceInfo: 'NT$ 46,900 起', groupSize: 18 }
    ]
  },
  {
    slug: 'seoul-family-4days',
    title: '首爾親子四日：樂天世界、南山塔輕鬆遊',
    summary: '安排大量親子友善景點與適度自由活動時間，適合帶小朋友一起出遊的家庭行程。',
    days: 4,
    status: 'published' as const,
    isFeatured: false,
    rank: 4,
    tagNames: ['韓國', '親子'],
    content: `<h2>行程亮點</h2><p>行程步調放緩，安排樂天世界、兒童大公園等親子景點，飯店選擇皆鄰近地鐵站方便移動。</p><h2>每日行程</h2><p><strong>Day 1</strong>：桃園機場 → 仁川機場 → 首爾入住</p><p><strong>Day 2</strong>：樂天世界 → 石村湖公園</p><p><strong>Day 3</strong>：南山首爾塔 → 明洞自由活動</p><p><strong>Day 4</strong>：仁川機場 → 桃園機場</p>`,
    batches: [
      { departureDate: '2026-10-02', returnDate: '2026-10-05', flightInfo: 'BR 桃園-仁川 直飛', meetingPoint: '桃園機場第一航廈', priceInfo: 'NT$ 28,900 起', groupSize: 20 },
      { departureDate: '2026-12-27', returnDate: '2026-12-30', flightInfo: 'CI 桃園-仁川 直飛', meetingPoint: '桃園機場第二航廈', priceInfo: 'NT$ 31,900 起', groupSize: 20 }
    ]
  },
  {
    slug: 'taipei-101-food-3days',
    title: '台北深度小旅行三日：101、在地美食巡禮',
    summary: '獻給國旅愛好者的台北深度行程，走訪信義區、大稻埕，品嚐在地小吃與精緻餐廳。',
    days: 3,
    status: 'published' as const,
    isFeatured: false,
    rank: 5,
    tagNames: ['台灣', '101', '美食', '深度旅遊'],
    content: `<h2>行程亮點</h2><p>國旅行程，適合外縣市旅客或想在地深度旅遊的旅客，安排 101 觀景台、大稻埕迪化街與多家在地口碑美食。</p><h2>每日行程</h2><p><strong>Day 1</strong>：集合 → 大稻埕迪化街 → 寧夏夜市</p><p><strong>Day 2</strong>：台北101觀景台 → 象山步道 → 信義區自由活動</p><p><strong>Day 3</strong>：故宮博物院 → 士林夜市 → 賦歸</p>`,
    batches: [
      { departureDate: '2026-09-18', returnDate: '2026-09-20', flightInfo: '無需搭機（國旅巴士接送）', meetingPoint: '台北車站東三門', priceInfo: 'NT$ 8,900 起', groupSize: 25 }
    ]
  },
  {
    slug: 'kyoto-spring-draft',
    title: '京都春季試辦行程（草稿）',
    summary: '尚在規劃中的春季行程草稿，內容尚未確認，不對外公開。',
    days: 5,
    status: 'draft' as const,
    isFeatured: false,
    rank: 0,
    tagNames: ['日本', '京都', '賞花'],
    content: `<h2>草稿內容</h2><p>行程細節尚未確認，僅供後台編輯測試草稿/發布功能。</p>`,
    batches: []
  }
]

export function seed() {
  const existing = db.select().from(trips).limit(1).all()
  if (existing.length > 0) return

  const tagIdByName = new Map<string, number>()
  for (const t of TAGS) {
    const row = db.insert(tags).values(t).returning().get()
    tagIdByName.set(t.name, row.id)
  }

  for (const trip of TRIPS) {
    const tripRow = db.insert(trips).values({
      slug: trip.slug,
      title: trip.title,
      summary: trip.summary,
      content: trip.content,
      days: trip.days,
      status: trip.status,
      isFeatured: trip.isFeatured,
      rank: trip.rank
    }).returning().get()

    for (const name of trip.tagNames) {
      const tagId = tagIdByName.get(name)
      if (tagId) db.insert(tripTags).values({ tripId: tripRow.id, tagId }).run()
    }

    for (const batch of trip.batches) {
      db.insert(batches).values({ tripId: tripRow.id, ...batch }).run()
    }

    const coverSeed = trip.slug
    const coverMedia = db.insert(media).values({
      r2Key: `trips/${trip.slug}/cover.jpg`,
      url: placeholderImage(coverSeed),
      category: trip.tagNames[0] ?? null
    }).returning().get()
    db.insert(tripImages).values({ tripId: tripRow.id, mediaId: coverMedia.id, isCover: true, sortOrder: 0 }).run()

    for (let i = 1; i <= 3; i++) {
      const galleryMedia = db.insert(media).values({
        r2Key: `trips/${trip.slug}/gallery-${i}.jpg`,
        url: placeholderImage(`${coverSeed}-${i}`),
        category: trip.tagNames[0] ?? null
      }).returning().get()
      db.insert(tripImages).values({ tripId: tripRow.id, mediaId: galleryMedia.id, isCover: false, sortOrder: i }).run()
    }
  }

  const firstTrip = db.select().from(trips).where(eq(trips.slug, 'tokyo-sakura-5days')).get()
  db.insert(contactSubmissions).values([
    { name: '陳小姐', phone: '0912-345-678', email: 'chen@example.com', interestedTripId: firstTrip?.id ?? null, message: '請問三月底的東京賞櫻團還有名額嗎？想幫爸媽報名兩位。' },
    { name: '林先生', phone: '0922-111-222', email: null, interestedTripId: null, message: '想詢問是否有規劃沖繩親子行程，預計明年暑假出發。' }
  ]).run()

  db.insert(heroContent).values({
    title: '無穹旅行社',
    subtitle: '帶你走進每一段值得記住的旅程',
    imageUrl: placeholderImage('hero-main', 1920, 1080)
  }).run()
}
