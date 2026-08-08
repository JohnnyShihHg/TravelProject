import { getDB } from '../utils/db'
import { trips, batches, tags, tripTags, media, tripImages, contactSubmissions, heroContent, contentBlocks, contentSnippets } from './schema'
import type { ContentBlockType } from './schema'
import { eq } from 'drizzle-orm'
import type { BlockData, DailyItineraryDay, FlightLeg } from '../utils/content-blocks'

function placeholderImage(seed: string, w = 1200, h = 800) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`
}

function day(day: number, title: string, html: string, meals: Partial<DailyItineraryDay['meals']>, hotel: string): DailyItineraryDay {
  return {
    day,
    title,
    html,
    meals: { breakfast: meals.breakfast ?? '', lunch: meals.lunch ?? '', dinner: meals.dinner ?? '', ...meals },
    hotel
  }
}

function leg(label: string, date: string, airline: string, fromCode: string, fromName: string, toCode: string, toName: string, departTime: string, arriveTime: string, duration: string): FlightLeg {
  return { label, date, airline, fromCode, fromName, toCode, toName, departTime, arriveTime, duration }
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

interface SeedTrip {
  slug: string
  title: string
  summary: string
  days: number
  status: 'draft' | 'published'
  isFeatured: boolean
  rank: number
  tagNames: string[]
  blocks: { type: ContentBlockType, data: BlockData }[]
  batches: { departureDate: string, returnDate: string, flightInfo: string, meetingPoint: string, priceInfo: string, groupSize: number }[]
}

const TRIPS: SeedTrip[] = [
  {
    slug: 'tokyo-sakura-5days',
    title: '東京櫻花五日：新宿、上野、河口湖賞櫻深度之旅',
    summary: '三月底四月初櫻花季限定，走訪新宿御苑、上野公園、河口湖，近距離眺望富士山與盛開櫻花。',
    days: 5,
    status: 'published',
    isFeatured: true,
    rank: 1,
    tagNames: ['日本', '東京', '富士山', '賞花'],
    blocks: [
      { type: 'highlights', data: { html: '<p><strong>經典賞櫻路線</strong> ~ 新宿御苑、上野公園、河口湖三大賞櫻名所一次收藏</p><p>本行程專為賞櫻旺季規劃，避開人潮擁擠的熱門時段，並前往河口湖眺望富士山與湖畔櫻花並列的經典畫面。</p>' } },
      { type: 'flight', data: { legs: [
        leg('去程', '2027-03-25', '中華航空', 'TPE', '桃園機場', 'NRT', '東京成田機場', '08:30', '12:55', '3h25m'),
        leg('回程', '2027-03-29', '中華航空', 'NRT', '東京成田機場', 'TPE', '桃園機場', '14:10', '16:50', '3h40m')
      ] } },
      { type: 'daily_itinerary', data: { days: [
        day(1, '桃園機場 → 東京成田機場 → 入住新宿飯店', '<p>集合於桃園機場，搭乘豪華客機飛往東京成田機場，抵達後專車前往新宿地區辦理入住。</p>', { dinner: '機上精緻簡餐' }, '新宿華盛頓飯店或同級'),
        day(2, '新宿御苑賞櫻 → 明治神宮 → 表參道自由活動', '<p>上午前往新宿御苑漫步賞櫻，隨後參觀明治神宮，下午於表參道自由活動、逛街購物。</p>', { breakfast: '飯店內早餐', lunch: '日式定食料理' }, '新宿華盛頓飯店或同級'),
        day(3, '河口湖畔賞櫻 → 富士山展望 → 溫泉飯店住宿', '<p>專車前往河口湖，欣賞富士山與湖畔櫻花並列的經典畫面，晚間入住溫泉飯店放鬆身心。</p>', { breakfast: '飯店內早餐', lunch: '湖畔餐廳', dinner: '溫泉飯店會席料理' }, '河口湖溫泉飯店或同級'),
        day(4, '上野公園賞櫻 → 淺草寺 → 台場自由活動', '<p>上午於上野公園賞櫻，參觀淺草寺雷門，下午於台場自由活動。</p>', { breakfast: '飯店內早餐' }, '新宿華盛頓飯店或同級'),
        day(5, '成田機場 → 桃園機場', '<p>專車前往成田機場，搭機返回溫暖的家。</p>', { breakfast: '飯店內早餐' }, '溫暖的家')
      ] } }
    ],
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
    status: 'published',
    isFeatured: true,
    rank: 2,
    tagNames: ['日本', '京都', '清水寺', '賞楓', '深度旅遊'],
    blocks: [
      { type: 'highlights', data: { html: '<p><strong>深度慢旅</strong> ~ 六天五夜完整停留京都，避開走馬看花的緊湊行程</p><p>京都是日本賞楓最具代表性的城市，讓旅客有充分時間感受古都氛圍。</p>' } },
      { type: 'flight', data: { legs: [
        leg('去程', '2026-11-14', '星宇航空', 'TPE', '桃園機場', 'KIX', '大阪關西機場', '09:10', '12:40', '3h30m'),
        leg('回程', '2026-11-19', '星宇航空', 'KIX', '大阪關西機場', 'TPE', '桃園機場', '13:40', '16:00', '3h20m')
      ] } },
      { type: 'daily_itinerary', data: { days: [
        day(1, '桃園機場 → 大阪關西機場 → 京都入住', '<p>搭機飛往大阪關西機場，專車接送前往京都入住。</p>', { dinner: '機上精緻簡餐' }, '京都站前飯店或同級'),
        day(2, '清水寺 → 二年坂三年坂 → 祇園花見小路', '<p>參觀世界遺產清水寺，漫步二年坂三年坂，於祇園花見小路感受古都風情。</p>', { breakfast: '飯店內早餐', lunch: '京都風味料理' }, '京都站前飯店或同級'),
        day(3, '嵐山竹林小徑 → 渡月橋 → 天龍寺', '<p>走訪嵐山竹林小徑、渡月橋，參觀世界遺產天龍寺庭園。</p>', { breakfast: '飯店內早餐', lunch: '嵐山湯豆腐料理' }, '京都站前飯店或同級'),
        day(4, '伏見稻荷大社千本鳥居 → 東福寺賞楓', '<p>參拜伏見稻荷大社千本鳥居，前往東福寺欣賞楓紅美景。</p>', { breakfast: '飯店內早餐' }, '京都站前飯店或同級'),
        day(5, '奈良公園 → 東大寺 → 大阪心齋橋自由活動', '<p>前往奈良公園與小鹿互動，參觀東大寺，晚間於大阪心齋橋自由活動。</p>', { breakfast: '飯店內早餐', lunch: '奈良鄉土料理' }, '大阪市區飯店或同級'),
        day(6, '大阪關西機場 → 桃園機場', '<p>專車前往關西機場，搭機返回溫暖的家。</p>', { breakfast: '飯店內早餐' }, '溫暖的家')
      ] } }
    ],
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
    status: 'published',
    isFeatured: false,
    rank: 3,
    tagNames: ['日本', '北海道', '溫泉', '美食'],
    blocks: [
      { type: 'highlights', data: { html: '<p><strong>雪國美食巡禮</strong> ~ 連續兩晚溫泉飯店住宿，深度品嚐北海道在地美食</p><p>寒冬中最療癒的旅程，包含湯咖哩、成吉思汗烤肉與二條市場現撈海鮮。</p>' } },
      { type: 'flight', data: { legs: [
        leg('去程', '2027-01-10', '中華航空', 'TPE', '桃園機場', 'CTS', '新千歲機場', '07:50', '12:30', '4h40m'),
        leg('回程', '2027-01-14', '中華航空', 'CTS', '新千歲機場', 'TPE', '桃園機場', '13:50', '17:20', '4h30m')
      ] } },
      { type: 'daily_itinerary', data: { days: [
        day(1, '桃園機場 → 新千歲機場 → 登別溫泉', '<p>搭機飛往新千歲機場，專車前往登別溫泉區入住。</p>', { dinner: '溫泉飯店會席料理' }, '登別溫泉飯店或同級'),
        day(2, '登別地獄谷 → 熊牧場 → 洞爺湖溫泉', '<p>參觀登別地獄谷、熊牧場，晚間入住洞爺湖溫泉飯店。</p>', { breakfast: '飯店內早餐', lunch: '成吉思汗烤肉' }, '洞爺湖溫泉飯店或同級'),
        day(3, '小樽運河 → 音樂盒博物館 → 札幌市區', '<p>漫步小樽運河、參觀音樂盒博物館，晚間入住札幌市區。</p>', { breakfast: '飯店內早餐', lunch: '小樽壽司' }, '札幌市區飯店或同級'),
        day(4, '白色戀人公園 → 二條市場 → 狸小路自由活動', '<p>參觀白色戀人公園，於二條市場品嚐現撈海鮮，晚間於狸小路自由活動。</p>', { breakfast: '飯店內早餐', lunch: '湯咖哩' }, '札幌市區飯店或同級'),
        day(5, '新千歲機場 → 桃園機場', '<p>專車前往新千歲機場，搭機返回溫暖的家。</p>', { breakfast: '飯店內早餐' }, '溫暖的家')
      ] } }
    ],
    batches: [
      { departureDate: '2027-01-10', returnDate: '2027-01-14', flightInfo: 'CI 桃園-新千歲 直飛', meetingPoint: '桃園機場第二航廈', priceInfo: 'NT$ 46,900 起', groupSize: 18 }
    ]
  },
  {
    slug: 'seoul-family-4days',
    title: '首爾親子四日：樂天世界、南山塔輕鬆遊',
    summary: '安排大量親子友善景點與適度自由活動時間，適合帶小朋友一起出遊的家庭行程。',
    days: 4,
    status: 'published',
    isFeatured: false,
    rank: 4,
    tagNames: ['韓國', '親子'],
    blocks: [
      { type: 'highlights', data: { html: '<p><strong>輕鬆親子遊</strong> ~ 行程步調放緩，安排樂天世界、兒童大公園等親子景點</p><p>飯店選擇皆鄰近地鐵站，方便親子移動。</p>' } },
      { type: 'flight', data: { legs: [
        leg('去程', '2026-10-02', '長榮航空', 'TPE', '桃園機場', 'ICN', '仁川機場', '09:00', '12:15', '2h15m'),
        leg('回程', '2026-10-05', '長榮航空', 'ICN', '仁川機場', 'TPE', '桃園機場', '13:20', '15:40', '2h20m')
      ] } },
      { type: 'daily_itinerary', data: { days: [
        day(1, '桃園機場 → 仁川機場 → 首爾入住', '<p>搭機飛往仁川機場，專車前往首爾市區入住。</p>', { dinner: '機上精緻簡餐' }, '首爾市區飯店或同級'),
        day(2, '樂天世界 → 石村湖公園', '<p>整日暢遊樂天世界主題樂園，午後於石村湖公園散步。</p>', { breakfast: '飯店內早餐', lunch: '園區內自理' }, '首爾市區飯店或同級'),
        day(3, '南山首爾塔 → 明洞自由活動', '<p>登上南山首爾塔欣賞市景，午後於明洞自由活動、購物。</p>', { breakfast: '飯店內早餐' }, '首爾市區飯店或同級'),
        day(4, '仁川機場 → 桃園機場', '<p>專車前往仁川機場，搭機返回溫暖的家。</p>', { breakfast: '飯店內早餐' }, '溫暖的家')
      ] } }
    ],
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
    status: 'published',
    isFeatured: false,
    rank: 5,
    tagNames: ['台灣', '101', '美食', '深度旅遊'],
    blocks: [
      { type: 'highlights', data: { html: '<p><strong>國旅深度行程</strong> ~ 適合外縣市旅客或想在地深度旅遊的旅客</p><p>安排 101 觀景台、大稻埕迪化街與多家在地口碑美食。</p>' } },
      { type: 'daily_itinerary', data: { days: [
        day(1, '集合 → 大稻埕迪化街 → 寧夏夜市', '<p>台北車站集合，漫步大稻埕迪化街，晚間於寧夏夜市享用道地小吃。</p>', { dinner: '寧夏夜市小吃' }, '台北市區飯店或同級'),
        day(2, '台北101觀景台 → 象山步道 → 信義區自由活動', '<p>登上台北101觀景台，健行象山步道欣賞市景，午後於信義區自由活動。</p>', { breakfast: '飯店內早餐', lunch: '信義區餐廳' }, '台北市區飯店或同級'),
        day(3, '故宮博物院 → 士林夜市 → 賦歸', '<p>參觀故宮博物院國寶文物，午後於士林夜市採買伴手禮後賦歸。</p>', { breakfast: '飯店內早餐', lunch: '士林夜市小吃' }, '賦歸')
      ] } }
    ],
    batches: [
      { departureDate: '2026-09-18', returnDate: '2026-09-20', flightInfo: '無需搭機（國旅巴士接送）', meetingPoint: '台北車站東三門', priceInfo: 'NT$ 8,900 起', groupSize: 25 }
    ]
  },
  {
    slug: 'kyoto-spring-draft',
    title: '京都春季試辦行程（草稿）',
    summary: '尚在規劃中的春季行程草稿，內容尚未確認，不對外公開。',
    days: 5,
    status: 'draft',
    isFeatured: false,
    rank: 0,
    tagNames: ['日本', '京都', '賞花'],
    blocks: [
      { type: 'richtext', data: { html: '<p>行程細節尚未確認，僅供後台編輯測試草稿/發布功能。</p>' } }
    ],
    batches: []
  }
]

const SNIPPETS: { name: string, type: ContentBlockType, data: BlockData }[] = [
  {
    name: '出國旅遊安全須知',
    type: 'richtext',
    data: { html: '<p><strong>出國旅遊安全須知</strong></p><p>1. 請於出發前確認護照效期至少 6 個月以上。</p><p>2. 建議自行投保旅遊平安險及不便險。</p><p>3. 隨身攜帶緊急聯絡卡與旅行社 24 小時緊急聯絡電話。</p><p>4. 貴重物品請隨身攜帶，勿置於托運行李中。</p>' }
  }
]

export async function seed() {
  const db = getDB()
  const existing = await db.select().from(trips).limit(1).all()
  if (existing.length > 0) return

  const tagIdByName = new Map<string, number>()
  for (const t of TAGS) {
    const row = await db.insert(tags).values(t).returning().get()
    tagIdByName.set(t.name, row.id)
  }

  for (const trip of TRIPS) {
    const tripRow = await db.insert(trips).values({
      slug: trip.slug,
      title: trip.title,
      summary: trip.summary,
      days: trip.days,
      status: trip.status,
      isFeatured: trip.isFeatured,
      rank: trip.rank
    }).returning().get()

    for (const name of trip.tagNames) {
      const tagId = tagIdByName.get(name)
      if (tagId) await db.insert(tripTags).values({ tripId: tripRow.id, tagId }).run()
    }

    for (const batch of trip.batches) {
      await db.insert(batches).values({ tripId: tripRow.id, ...batch }).run()
    }

    for (const [index, block] of trip.blocks.entries()) {
      await db.insert(contentBlocks).values({
        tripId: tripRow.id,
        type: block.type,
        sortOrder: index,
        data: JSON.stringify(block.data)
      }).run()
    }

    const coverSeed = trip.slug
    const coverMedia = await db.insert(media).values({
      r2Key: `trips/${trip.slug}/cover.jpg`,
      url: placeholderImage(coverSeed),
      category: trip.tagNames[0] ?? null
    }).returning().get()
    await db.insert(tripImages).values({ tripId: tripRow.id, mediaId: coverMedia.id, isCover: true, sortOrder: 0 }).run()

    for (let i = 1; i <= 3; i++) {
      const galleryMedia = await db.insert(media).values({
        r2Key: `trips/${trip.slug}/gallery-${i}.jpg`,
        url: placeholderImage(`${coverSeed}-${i}`),
        category: trip.tagNames[0] ?? null
      }).returning().get()
      await db.insert(tripImages).values({ tripId: tripRow.id, mediaId: galleryMedia.id, isCover: false, sortOrder: i }).run()
    }
  }

  for (const snippet of SNIPPETS) {
    await db.insert(contentSnippets).values({
      name: snippet.name,
      type: snippet.type,
      data: JSON.stringify(snippet.data)
    }).run()
  }

  const firstTrip = await db.select().from(trips).where(eq(trips.slug, 'tokyo-sakura-5days')).get()
  await db.insert(contactSubmissions).values([
    { name: '陳小姐', phone: '0912-345-678', email: 'chen@example.com', interestedTripId: firstTrip?.id ?? null, message: '請問三月底的東京賞櫻團還有名額嗎？想幫爸媽報名兩位。' },
    { name: '林先生', phone: '0922-111-222', email: null, interestedTripId: null, message: '想詢問是否有規劃沖繩親子行程，預計明年暑假出發。' }
  ]).run()

  await db.insert(heroContent).values({
    title: '無穹旅行社',
    subtitle: '帶你走進每一段值得記住的旅程',
    imageUrl: placeholderImage('hero-main', 1920, 1080)
  }).run()
}
