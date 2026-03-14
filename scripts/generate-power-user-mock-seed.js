const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'data', 'power-user-mock-seed.json');
const DAY = 864e5;
const NOW = new Date('2026-03-13T16:00:00Z').getTime();

const da = (days, hour = 16) => NOW - days * DAY + (hour - 16) * 36e5;
const df = (days, hour = 16) => NOW + days * DAY + (hour - 16) * 36e5;
const slug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
const normTitle = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const createId = (prefix, value) => `${prefix}-${slug(value)}`;
const field = (id, label, kind) => ({ id, label, kind });
const prefs = (overrides = {}) => ({
  viewMode: 'list',
  sortMode: 'manual',
  filterMode: 'all',
  groupMode: 'none',
  showCompleted: true,
  ...overrides,
});
const config = (
  addons = [],
  fieldDefinitions = [],
  defaultEntryType = 'custom',
  automationBlocks = []
) => ({
  addons: [...new Set(addons)],
  automationBlocks,
  fieldDefinitions,
  defaultEntryType,
});

function readEnvKey(name) {
  const fromEnv = (process.env[name] || '').trim();
  if (fromEnv) return fromEnv;

  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return '';

  const line = fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));

  return line ? line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '') : '';
}

async function fetchJson(url, attempt = 0) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'OlistPlayground2 mock seed generator' },
  });
  if (response.status === 429 && attempt < 8) {
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return response.json();
}

async function jikan(kind, title) {
  const data =
    (await fetchJson(
      `https://api.jikan.moe/v4/${kind}?q=${encodeURIComponent(title)}&limit=5`
    )).data || [];
  const target = normTitle(title);
  return (
    data.find((item) => normTitle(item.title_english || item.title || '') === target) ||
    data.find((item) => (item.titles || []).some((alt) => normTitle(alt.title || '') === target)) ||
    data[0]
  );
}

async function googleBook(title, author) {
  const q = `intitle:${title}${author ? `+inauthor:${author}` : ''}`;
  const apiKey = readEnvKey('EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY');
  const keyQuery = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
  const items =
    (await fetchJson(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5${keyQuery}`
    )).items || [];
  const target = normTitle(title);
  const authorTarget = author ? normTitle(author) : '';
  return (
    items.find((item) => {
      const info = item.volumeInfo || {};
      return (
        normTitle(info.title || '') === target &&
        (!authorTarget || (info.authors || []).some((name) => normTitle(name) === authorTarget))
      );
    }) ||
    items.find((item) => normTitle(item.volumeInfo?.title || '') === target) ||
    items[0]
  );
}

async function tmdb(title, type, key) {
  const results =
    (await fetchJson(
      `https://api.themoviedb.org/3/search/${type}?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(title)}&include_adult=false&page=1`
    )).results || [];
  const target = normTitle(title);
  return results.find((item) => normTitle(item.title || item.name || '') === target) || results[0];
}

function entry(title, overrides = {}) {
  return {
    id: overrides.id || createId('entry', title),
    title,
    type: overrides.type || 'custom',
    imageUrl: overrides.imageUrl,
    detailPath: overrides.detailPath,
    notes: overrides.notes,
    customFields: overrides.customFields,
    linkedEntryId: overrides.linkedEntryId,
    linkedListId: overrides.linkedListId,
    checked: overrides.checked,
    status: overrides.status,
    rating: overrides.rating,
    tags: overrides.tags || [],
    progress: overrides.progress,
    sourceRef:
      overrides.sourceRef ||
      {
        source: overrides.type === 'link' ? 'link' : 'custom',
        externalId: overrides.externalId,
        detailPath: overrides.detailPath,
        canonicalUrl: overrides.productUrl,
      },
    addedAt: overrides.addedAt,
    updatedAt: overrides.updatedAt,
    reminderAt: overrides.reminderAt,
    productUrl: overrides.productUrl,
    price: overrides.price,
    archivedAt: overrides.archivedAt,
  };
}

function linkedEntry(title, linkedListId, overrides = {}) {
  return entry(title, {
    ...overrides,
    type: 'list',
    linkedListId,
    detailPath: `list/${linkedListId}`,
    sourceRef: { source: 'custom', detailPath: `list/${linkedListId}` },
  });
}

function list(id, title, entries, overrides = {}) {
  return {
    id,
    title,
    imageUrl: overrides.imageUrl,
    description: overrides.description,
    tags: overrides.tags || [],
    preset: overrides.preset || 'blank',
    config: overrides.config || config(),
    entries,
    preferences: overrides.preferences || prefs(),
    pinned: !!overrides.pinned,
    createdAt: overrides.createdAt || da(30),
    updatedAt: overrides.updatedAt || da(1),
    templateId: overrides.templateId,
    parentListId: overrides.parentListId,
    archivedAt: overrides.archivedAt,
    deletedAt: overrides.deletedAt,
  };
}

function animeEntry(item, overrides = {}) {
  return {
    id: createId('entry', `${item.mal_id}-${item.title}`),
    title: item.title_english || item.title,
    type: 'anime',
    imageUrl:
      item.images?.webp?.large_image_url ||
      item.images?.jpg?.large_image_url ||
      item.images?.jpg?.image_url,
    detailPath: `anime/${item.mal_id}`,
    totalEpisodes: typeof item.episodes === 'number' ? item.episodes : undefined,
    tags: overrides.tags || [],
    status: overrides.status,
    rating: overrides.rating,
    progress: overrides.progress,
    notes: overrides.notes,
    reminderAt: overrides.reminderAt,
    customFields: overrides.customFields,
    sourceRef: {
      source: 'anime',
      externalId: String(item.mal_id),
      detailPath: `anime/${item.mal_id}`,
      canonicalUrl: item.url,
    },
    addedAt: overrides.addedAt,
    updatedAt: overrides.updatedAt,
  };
}

function mangaEntry(item, overrides = {}) {
  return {
    id: createId('entry', `${item.mal_id}-${item.title}`),
    title: item.title_english || item.title,
    type: 'manga',
    imageUrl:
      item.images?.webp?.large_image_url ||
      item.images?.jpg?.large_image_url ||
      item.images?.jpg?.image_url,
    detailPath: `manga/${item.mal_id}`,
    totalChapters: typeof item.chapters === 'number' ? item.chapters : undefined,
    totalVolumes: typeof item.volumes === 'number' ? item.volumes : undefined,
    tags: overrides.tags || [],
    status: overrides.status,
    rating: overrides.rating,
    progress: overrides.progress,
    notes: overrides.notes,
    reminderAt: overrides.reminderAt,
    customFields: overrides.customFields,
    sourceRef: {
      source: 'manga',
      externalId: String(item.mal_id),
      detailPath: `manga/${item.mal_id}`,
      canonicalUrl: item.url,
    },
    addedAt: overrides.addedAt,
    updatedAt: overrides.updatedAt,
  };
}
function bookEntry(item, overrides = {}) {
  const info = item.volumeInfo || {};
  const images = info.imageLinks || {};
  return {
    id: createId('entry', `${item.id}-${info.title}`),
    title: info.title,
    type: 'book',
    imageUrl: (images.extraLarge || images.large || images.medium || images.thumbnail || '').replace(/^http:/, 'https:'),
    detailPath: `books/${item.id}`,
    tags: overrides.tags || [],
    status: overrides.status,
    rating: overrides.rating,
    progress: overrides.progress,
    notes: overrides.notes,
    reminderAt: overrides.reminderAt,
    customFields: overrides.customFields,
    sourceRef: {
      source: 'book',
      externalId: item.id,
      detailPath: `books/${item.id}`,
      canonicalUrl: info.infoLink,
    },
    addedAt: overrides.addedAt,
    updatedAt: overrides.updatedAt,
  };
}

function tmdbEntry(item, type, overrides = {}) {
  const title = item.title || item.name;
  return {
    id: createId('entry', `${type}-${item.id}-${title}`),
    title,
    type,
    imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : undefined,
    detailPath: `tv-movie/${type}/${item.id}`,
    tags: overrides.tags || [],
    status: overrides.status,
    rating: overrides.rating,
    progress: overrides.progress,
    notes: overrides.notes,
    reminderAt: overrides.reminderAt,
    sourceRef: {
      source: type,
      externalId: String(item.id),
      detailPath: `tv-movie/${type}/${item.id}`,
      canonicalUrl: `https://www.themoviedb.org/${type}/${item.id}`,
    },
    addedAt: overrides.addedAt,
    updatedAt: overrides.updatedAt,
  };
}

function batch(titles, builder) {
  return titles.map((title, index) => entry(title, builder(index, title)));
}

function template(id, title, description, preset, configValue, starterEntries) {
  return { id, title, description, source: 'user', preset, config: configValue, starterEntries };
}

(async () => {
  const tmdbKey = readEnvKey('EXPO_PUBLIC_TMDB_API_KEY');
  if (!tmdbKey) {
    throw new Error('Missing EXPO_PUBLIC_TMDB_API_KEY');
  }

  const animeTitles = [
    "Frieren: Beyond Journey's End",
    'Blue Lock',
    'Delicious in Dungeon',
    'The Apothecary Diaries',
    'Solo Leveling',
    'Vinland Saga',
    'Spy x Family',
    'PLUTO',
  ];
  const mangaTitles = [
    'Blue Period',
    'One Piece',
    'Vagabond',
    'Chainsaw Man',
    'PLUTO',
    'Delicious in Dungeon',
    'Slam Dunk',
    'Witch Hat Atelier',
  ];
  const bookTitles = [
    ['Atomic Habits', 'James Clear'],
    ['The Hobbit', 'J.R.R. Tolkien'],
    ['Project Hail Mary', 'Andy Weir'],
    ['Deep Work', 'Cal Newport'],
    ['Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin'],
    ['Babel', 'R. F. Kuang'],
    ['The Pragmatic Programmer', 'Andrew Hunt'],
    ['Piranesi', 'Susanna Clarke'],
  ];
  const tmdbTitles = [
    ['Severance', 'tv'],
    ['The Bear', 'tv'],
    ['Andor', 'tv'],
    ['Slow Horses', 'tv'],
    ['Dune: Part Two', 'movie'],
    ['Spider-Man: Across the Spider-Verse', 'movie'],
    ['Godzilla Minus One', 'movie'],
    ['Past Lives', 'movie'],
  ];

  const anime = [];
  for (const title of animeTitles) anime.push(await jikan('anime', title));

  const manga = [];
  for (const title of mangaTitles) manga.push(await jikan('manga', title));

  const books = [];
  for (const [title, author] of bookTitles) books.push(await googleBook(title, author));

  const tmdbResults = [];
  for (const [title, type] of tmdbTitles) tmdbResults.push(await tmdb(title, type, tmdbKey));

  const IDS = {
    watch: 'list-power-watch-queue',
    read: 'list-power-reading-stack',
    wish: 'list-power-wishlist',
    meal: 'list-power-meal-rotation',
    fit: 'list-power-fitness-system',
    career: 'list-power-career-radar',
    travel: 'list-power-travel-hub',
    japan: 'list-power-japan-2027',
    tokyo: 'list-power-tokyo-week',
    coffeeTrip: 'list-power-tokyo-coffee-crawl',
    home: 'list-power-home-hub',
    kitchen: 'list-power-kitchen-refresh',
    coffeeHome: 'list-power-coffee-station',
    grinder: 'list-power-grinder-research',
    tier: 'list-power-takeout-tier',
    s: 'list-power-takeout-s',
    a: 'list-power-takeout-a',
    b: 'list-power-takeout-b',
    c: 'list-power-takeout-c',
    arch: 'list-power-archived-reading-2025',
    del: 'list-power-deleted-gift-ideas-2025',
  };

  const watchEntries = [
    animeEntry(anime[0], { status: 'active', rating: 10, tags: ['fantasy', 'weekly'], progress: { current: 21, total: anime[0].episodes || 28, unit: 'episode', updatedAt: da(1) }, notes: 'Weekend binge save.', reminderAt: df(2), addedAt: da(70), updatedAt: da(1) }),
    animeEntry(anime[1], { status: 'paused', rating: 8, tags: ['sports'], progress: { current: 14, total: anime[1].episodes || 24, unit: 'episode', updatedAt: da(5) }, addedAt: da(85), updatedAt: da(5) }),
    animeEntry(anime[2], { status: 'completed', rating: 9, tags: ['food', 'adventure'], progress: { current: anime[2].episodes || 24, total: anime[2].episodes || 24, unit: 'episode', updatedAt: da(11) }, addedAt: da(65), updatedAt: da(11) }),
    animeEntry(anime[3], { status: 'active', rating: 9, tags: ['mystery'], progress: { current: 16, total: anime[3].episodes || 24, unit: 'episode', updatedAt: da(2) }, reminderAt: df(4), addedAt: da(42), updatedAt: da(2) }),
    animeEntry(anime[4], { status: 'planned', tags: ['action'], notes: 'Waiting for dubbed batch.', reminderAt: df(10), addedAt: da(26), updatedAt: da(3) }),
    animeEntry(anime[5], { status: 'completed', rating: 10, tags: ['historical'], progress: { current: anime[5].episodes || 24, total: anime[5].episodes || 24, unit: 'episode', updatedAt: da(30) }, addedAt: da(140), updatedAt: da(30) }),
    animeEntry(anime[6], { status: 'active', rating: 8, tags: ['family-watch'], progress: { current: 22, total: anime[6].episodes || 25, unit: 'episode', updatedAt: da(6) }, addedAt: da(48), updatedAt: da(6) }),
    animeEntry(anime[7], { status: 'planned', tags: ['prestige'], addedAt: da(32), updatedAt: da(9) }),
    tmdbEntry(tmdbResults[0], 'tv', { status: 'planned', tags: ['apple-tv+'], notes: 'Waiting for two more episodes.', reminderAt: df(5), addedAt: da(24), updatedAt: da(2) }),
    tmdbEntry(tmdbResults[1], 'tv', { status: 'completed', rating: 9, tags: ['rewatch'], progress: { current: 18, total: 18, unit: 'episode', updatedAt: da(4) }, addedAt: da(110), updatedAt: da(4) }),
    tmdbEntry(tmdbResults[2], 'tv', { status: 'active', rating: 9, tags: ['star-wars'], progress: { current: 6, total: 12, unit: 'episode', updatedAt: da(1) }, reminderAt: df(7), addedAt: da(16), updatedAt: da(1) }),
    tmdbEntry(tmdbResults[3], 'tv', { status: 'planned', tags: ['spy'], addedAt: da(19), updatedAt: da(6) }),
    tmdbEntry(tmdbResults[4], 'movie', { status: 'completed', rating: 9, tags: ['imax', 'sci-fi'], progress: { current: 1, total: 1, unit: 'item', updatedAt: da(9) }, addedAt: da(14), updatedAt: da(9) }),
    tmdbEntry(tmdbResults[5], 'movie', { status: 'completed', rating: 10, tags: ['animation'], progress: { current: 1, total: 1, unit: 'item', updatedAt: da(45) }, addedAt: da(180), updatedAt: da(45) }),
    tmdbEntry(tmdbResults[6], 'movie', { status: 'planned', tags: ['monster'], reminderAt: df(14), addedAt: da(21), updatedAt: da(8) }),
    tmdbEntry(tmdbResults[7], 'movie', { status: 'completed', rating: 8, tags: ['drama'], progress: { current: 1, total: 1, unit: 'item', updatedAt: da(120) }, addedAt: da(240), updatedAt: da(120) }),
  ];

  const readingEntries = [
    bookEntry(books[0], { status: 'active', rating: 9, tags: ['nonfiction', 'habits'], progress: { current: 42, total: 100, unit: 'percent', updatedAt: da(2) }, reminderAt: df(1), customFields: [{ title: 'Creator', value: 'James Clear' }, { title: 'Format', value: 'Hardcover' }, { title: 'Pages', value: '320', format: 'numbers' }], addedAt: da(40), updatedAt: da(2) }),
    bookEntry(books[1], { status: 'completed', rating: 10, tags: ['fantasy', 'reread'], progress: { current: 100, total: 100, unit: 'percent', updatedAt: da(80) }, addedAt: da(280), updatedAt: da(80) }),
    bookEntry(books[2], { status: 'completed', rating: 10, tags: ['sci-fi'], progress: { current: 100, total: 100, unit: 'percent', updatedAt: da(130) }, addedAt: da(300), updatedAt: da(130) }),
    bookEntry(books[3], { status: 'planned', tags: ['focus'], reminderAt: df(9), addedAt: da(18), updatedAt: da(3) }),
    bookEntry(books[4], { status: 'active', rating: 9, tags: ['fiction'], progress: { current: 58, total: 100, unit: 'percent', updatedAt: da(1) }, addedAt: da(29), updatedAt: da(1) }),
    bookEntry(books[5], { status: 'planned', tags: ['fantasy'], addedAt: da(15), updatedAt: da(7) }),
    bookEntry(books[6], { status: 'active', rating: 9, tags: ['engineering', 'career'], progress: { current: 26, total: 100, unit: 'percent', updatedAt: da(2) }, addedAt: da(17), updatedAt: da(2) }),
    bookEntry(books[7], { status: 'completed', rating: 9, tags: ['mystery'], progress: { current: 100, total: 100, unit: 'percent', updatedAt: da(170) }, addedAt: da(365), updatedAt: da(170) }),
    mangaEntry(manga[0], { status: 'active', rating: 9, tags: ['art', 'ongoing'], progress: { current: 64, unit: 'chapter', updatedAt: da(1) }, customFields: [{ title: 'Creator', value: 'Tsubasa Yamaguchi' }, { title: 'Format', value: 'Digital' }], addedAt: da(90), updatedAt: da(1) }),
    mangaEntry(manga[1], { status: 'paused', rating: 10, tags: ['marathon'], progress: { current: 1112, unit: 'chapter', updatedAt: da(10) }, addedAt: da(500), updatedAt: da(10) }),
    mangaEntry(manga[2], { status: 'completed', rating: 10, tags: ['samurai'], progress: { current: manga[2].chapters || 327, total: manga[2].chapters || 327, unit: 'chapter', updatedAt: da(620) }, addedAt: da(1200), updatedAt: da(620) }),
    mangaEntry(manga[3], { status: 'active', rating: 9, tags: ['chaotic'], progress: { current: 192, unit: 'chapter', updatedAt: da(2) }, addedAt: da(220), updatedAt: da(2) }),
    mangaEntry(manga[4], { status: 'planned', tags: ['mystery'], addedAt: da(17), updatedAt: da(6) }),
    mangaEntry(manga[5], { status: 'completed', rating: 9, tags: ['food', 'fantasy'], progress: { current: manga[5].chapters || 97, total: manga[5].chapters || 97, unit: 'chapter', updatedAt: da(150) }, addedAt: da(420), updatedAt: da(150) }),
    mangaEntry(manga[6], { status: 'completed', rating: 10, tags: ['sports'], progress: { current: manga[6].chapters || 276, total: manga[6].chapters || 276, unit: 'chapter', updatedAt: da(700) }, addedAt: da(1500), updatedAt: da(700) }),
    mangaEntry(manga[7], { status: 'planned', tags: ['fantasy', 'art'], reminderAt: df(12), addedAt: da(21), updatedAt: da(4) }),
  ];
  const wishlistEntries = batch(
    [
      'AeroPress XL',
      'Logitech MX Master 3S',
      'Kindle Paperwhite Signature Edition',
      'Patagonia Black Hole Mini MLC 30L',
      'Owala FreeSip 32oz',
      'Sony WH-1000XM5',
      'Nintendo Switch 2 Travel Case',
      'Fellow Ode Brew Grinder Gen 2',
      'Herman Miller Embody',
      'Peak Design Tech Pouch',
      'LEGO Icons Rivendell',
      'A24 screenplay bundle',
      'Moccamaster KBGV Select',
      'Nanoleaf 4D camera kit',
      'Carry-on rain shell upgrade',
      'iPad mini for travel reading',
    ],
    (index) => ({
      type: index !== 6 && index !== 11 && index < 14 ? 'link' : 'custom',
      status: 'planned',
      tags:
        [
          ['coffee', 'gear'],
          ['desk', 'productivity'],
          ['reading', 'travel'],
          ['travel', 'carry-on'],
          ['hydration'],
          ['audio', 'travel'],
          ['gaming', 'travel'],
          ['coffee'],
          ['desk', 'ergonomics'],
          ['travel', 'edc'],
          ['display'],
          ['collecting'],
          ['coffee', 'kitchen'],
          ['lighting', 'desk'],
          ['travel', 'outdoors'],
          ['reading', 'travel'],
        ][index] || [],
      productUrl:
        [
          'https://aeropress.com/products/aeropress-xl-coffee-press',
          'https://www.logitech.com/en-us/shop/p/mx-master-3s',
          'https://www.amazon.com/dp/B08B495319',
          'https://www.patagonia.com/product/black-hole-mini-mlc-convertible-backpack-30-liters/49266.html',
          'https://owalalife.com/products/freesip',
          'https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b',
          null,
          'https://fellowproducts.com/products/ode-brew-grinder-gen-2',
          'https://store.hermanmiller.com/office-chairs/embody-chair/4737.html',
          'https://www.peakdesign.com/products/tech-pouch',
          'https://www.lego.com/en-us/product/the-lord-of-the-rings-rivendell-10316',
          null,
          'https://us.moccamaster.com/collections/glass-carafe-brewers/products/kbgv-select',
          'https://nanoleaf.me/en-US/products/nanoleaf-4d/',
          null,
          null,
        ][index] || undefined,
      price:
        [
          '$69.95',
          '$99.99',
          '$189.99',
          '$199.00',
          '$39.99',
          '$399.99',
          null,
          '$345.00',
          '$1,995.00',
          '$59.95',
          '$499.99',
          null,
          '$359.00',
          '$99.99',
          null,
          null,
        ][index] || undefined,
      notes: index % 5 === 0 ? 'Hold for sale or the right timing.' : undefined,
      addedAt: da(60 - index * 2),
      updatedAt: da(index % 9),
      customFields:
        index < 4
          ? [
              { title: 'Store', value: ['AeroPress', 'Logitech', 'Amazon', 'Patagonia'][index] },
              { title: 'Target Price', value: String([60, 80, 150, 170][index]), format: 'numbers' },
            ]
          : undefined,
    })
  );

  const mealEntries = batch(
    ['Spicy vodka rigatoni', 'Weeknight salmon bowls', 'Miso butter mushrooms', 'Sheet pan shawarma', 'Chicken katsu curry', 'Lemon orzo soup', 'Crispy tofu bibimbap', 'Brothy white bean pasta', 'Soba lunch boxes', 'Breakfast tacos', 'Big salad base prep', 'Freezer burritos', 'Turkey chili', 'Homemade crunchwraps', 'Roasted sweet potato bowls', 'Date night steak frites'],
    (index) => ({
      checked: index % 4 === 0,
      tags: index % 3 === 0 ? ['repeat'] : index % 3 === 1 ? ['high-protein'] : [],
      notes: index % 5 === 0 ? 'Keep ingredients stocked.' : undefined,
      addedAt: da(45 - index),
      updatedAt: da(index % 6),
      customFields: [
        { title: 'Prep Minutes', value: String(20 + index * 3), format: 'numbers' },
        { title: 'Servings', value: String(2 + (index % 4)), format: 'numbers' },
      ],
    })
  );

  const fitnessEntries = batch(
    ['Lower body strength block', 'Upper body pull day', 'Upper body push day', 'Zone 2 treadmill hour', 'Saturday long walk', 'Mobility reset 20 min', 'Core circuit', 'Meal prep protein batch', 'Sleep by 11:00 PM', 'Water bottle 3x fills', 'Electrolytes reorder', 'Physical therapy band work', 'Track resting heart rate', 'Deload week plan', 'Quarterly bloodwork follow-up', 'Stretch after desk sessions'],
    (index) => ({
      status: index < 4 ? 'active' : index < 10 ? 'planned' : index < 12 ? 'completed' : 'planned',
      tags: [index % 2 === 0 ? 'health' : 'routine'],
      reminderAt: index < 8 ? df((index % 7) + 1, 8) : undefined,
      notes: index % 4 === 0 ? 'Non-negotiable on work-heavy weeks.' : undefined,
      customFields: [
        { title: 'Owner', value: 'Justin' },
        { title: 'Cadence', value: index % 3 === 0 ? 'Weekly' : 'Daily' },
      ],
      addedAt: da(35 - index),
      updatedAt: da(index % 5),
    })
  );

  const coffeeTripEntries = batch(
    ['Glitch Coffee Roasters Ginza', 'Koffee Mameya Kakeru', 'Onibus Coffee Nakameguro', 'Leaves Coffee Roasters', 'Fuglen Asakusa', 'Little Nap Coffee Stand', 'Ogawa Coffee Laboratory', 'Chatei Hatou', 'Coffee Supreme Tokyo', 'Unlimited Coffee Bar', 'Switch Coffee Tokyo', 'Raw Sugar Roast', 'About Life Coffee Brewers', 'Sarutahiko Coffee The Bridge', 'Coffee Wrights Kuramae', 'Streamer Coffee Shibuya'],
    (index) => ({
      tags: index % 3 === 0 ? ['must-hit'] : index % 3 === 1 ? ['espresso'] : ['filter'],
      notes: index % 4 === 0 ? 'Bundle with a nearby walk.' : undefined,
      customFields: [
        { title: 'Neighborhood', value: ['Ginza', 'Shibuya', 'Nakameguro', 'Kuramae'][index % 4] },
        { title: 'Priority', value: String(1 + (index % 5)), format: 'numbers' },
      ],
      addedAt: da(60 - index),
      updatedAt: da(index % 6),
    })
  );

  const tokyoEntries = [
    linkedEntry('Tokyo Coffee Crawl', IDS.coffeeTrip, { status: 'active', tags: ['coffee'], notes: 'Anchor two stops per open day.', customFields: [{ title: 'Owner', value: 'Justin' }, { title: 'Due Date', value: '2027-04-10' }], addedAt: da(40), updatedAt: da(1) }),
    ...batch(['Book teamLab Borderless tickets', 'Reserve sushi counter for one splurge night', 'Map Shibuya Harajuku and Daikanyama route', 'Assemble Tokyo station arrival checklist', 'Create rainy-day fallback plan', 'Pin stationery stores in Maps', 'Choose two jazz bars', 'Find one sento worth the detour', 'Hold one empty afternoon for wandering', 'Draft day-by-day subway notes', 'Check baseball schedule', 'Shortlist ramen shops by neighborhood', 'Save Fuji day-trip backup routes', 'Build packing list for two climate bands', 'Record cash-first spots from research'], (index) => ({ status: ['planned', 'planned', 'active', 'completed', 'planned', 'active', 'planned', 'planned', 'planned', 'active', 'planned', 'active', 'planned', 'completed', 'planned'][index], tags: [['tickets'], ['food'], ['route'], ['transit'], ['backup'], ['shopping'], ['night'], ['recovery'], ['pace'], ['transit'], ['sports'], ['food'], ['backup'], ['packing'], ['money']][index], addedAt: da(26 - index), updatedAt: da((index % 6) + 1), reminderAt: index === 0 ? df(20) : undefined })),
  ];

  const japanEntries = [
    linkedEntry('Tokyo Week', IDS.tokyo, { status: 'active', tags: ['tokyo'], notes: 'Main city block.', customFields: [{ title: 'Owner', value: 'Justin' }, { title: 'Due Date', value: '2027-02-01' }], addedAt: da(50), updatedAt: da(1) }),
    ...batch(['Kyoto three-day sketch itinerary', 'Osaka food corridor research', 'Hakone ryokan shortlist', 'JR pass decision matrix', 'Sakura timing notes', 'International driving permit reminder', 'Tokyo hotel loyalty comparison', 'Budget by district and day', 'Pocket Wi-Fi vs eSIM tradeoff', 'Restaurant reservation window tracker', 'Neighborhood photo walk shortlist', 'Gift shopping list by person', 'Favorite coffee roasters shipping home', 'Backup rainy museum plan', 'Emergency phrases cheatsheet'], (index) => ({ status: ['planned', 'active', 'planned', 'active', 'completed', 'planned', 'planned', 'active', 'completed', 'active', 'planned', 'planned', 'planned', 'planned', 'completed'][index], tags: [['kyoto'], ['osaka', 'food'], ['hotel'], ['budget', 'transit'], ['season'], ['admin'], ['points'], ['budget'], ['connectivity'], ['food'], ['photo'], ['shopping'], ['coffee'], ['backup'], ['language']][index], addedAt: da(42 - index * 2), updatedAt: da((index % 7) + 1), reminderAt: index === 5 ? df(180) : index === 9 ? df(120) : undefined, customFields: index === 3 ? [{ title: 'Owner', value: 'Justin' }, { title: 'Due Date', value: '2026-11-01' }] : undefined })),
  ];

  const travelEntries = [
    linkedEntry('Japan 2027', IDS.japan, { status: 'active', tags: ['international'], notes: 'Main long-haul planning stack.', customFields: [{ title: 'Owner', value: 'Justin' }, { title: 'Budget', value: '6000', format: 'numbers' }], addedAt: da(60), updatedAt: da(1) }),
    ...batch(['Montreal fall weekend ideas', 'National parks loop rough route', 'Airline points burn priorities', 'Hotel elite status cheatsheet', 'Packing system v3', 'Carry-on toiletries restock', 'Global eSIM provider comparison', 'Trusted Housesitters someday list', 'Airport lounge access matrix', 'Favorite neighborhood hotels sheet', 'Trip photo backup checklist', 'Coffee gear travel kit', 'Emergency travel folder refresh', 'International card no-FTF audit', 'Friends to visit by city'], (index) => ({ status: ['planned', 'planned', 'active', 'completed', 'active', 'planned', 'planned', 'planned', 'completed', 'active', 'planned', 'planned', 'completed', 'planned', 'planned'][index], tags: [['weekend'], ['road-trip'], ['points'], ['points'], ['packing'], ['packing'], ['connectivity'], ['someday'], ['comfort'], ['hotel'], ['photo'], ['coffee'], ['admin'], ['money'], ['people']][index], addedAt: da(20 - index), updatedAt: da((index % 6) + 1) })),
  ];
  const grinderEntries = batch(
    ['Fellow Ode Gen 2', 'DF64 Gen 2', 'Lagom Mini', '1Zpresso ZP6', 'Comandante C40', 'Niche Zero', 'Timemore Sculptor 078', 'Review retention workflow notes', 'Measure cabinet clearance', 'Budget ceiling check', 'Prioritize filter-first workflow', 'Noise tolerance note', 'Ask friends about DF64 longevity', 'Check burr upgrade path', 'Watch Lance Hedrick comparison again', 'Decide by end of quarter'],
    (index) => ({
      type: index === 0 || index === 14 ? 'link' : 'custom',
      status: index === 9 ? 'active' : index === 7 || index === 8 || index === 10 || index === 11 ? 'completed' : index > 11 ? 'planned' : undefined,
      tags: [['flat-burr'], ['flat-burr'], ['travel'], ['manual'], ['manual'], ['espresso'], ['flat-burr'], ['research'], ['prep'], ['budget'], ['decision'], ['kitchen'], ['research'], ['research'], ['video'], ['deadline']][index],
      productUrl: index === 0 ? 'https://fellowproducts.com/products/ode-brew-grinder-gen-2' : index === 14 ? 'https://www.youtube.com/' : undefined,
      price: index === 0 ? '$345.00' : undefined,
      notes: index === 1 ? 'Value pick if workflow is clean.' : undefined,
      addedAt: da(30 - index),
      updatedAt: da((index % 8) + 1),
      reminderAt: index === 15 ? df(21) : undefined,
    })
  );

  const coffeeHomeEntries = [
    linkedEntry('Grinder Research', IDS.grinder, { status: 'active', tags: ['gear'], notes: 'Need a grinder decision first.', customFields: [{ title: 'Owner', value: 'Justin' }, { title: 'Budget', value: '450', format: 'numbers' }], addedAt: da(30), updatedAt: da(1) }),
    ...batch(['Finalize brewer shelf height', 'Decide glassware storage zone', 'Cable manage scale charger', 'Water filter refill cadence', 'Label bean jars', 'Create brew bar cleaning kit', 'Test morning workflow with guest setup', 'Choose tray for syrups and spoons', 'Pull cabinet lighting samples', 'Store mugs by daily use order', 'Audit spare filters and papers', 'Buy one nicer kettle stand', 'Shortlist one espresso machine upgrade path', 'Create decaf bean lane', 'Photograph final station once finished'], (index) => ({ status: ['completed', 'planned', 'planned', 'active', 'planned', 'planned', 'planned', 'planned', 'planned', 'completed', 'completed', 'planned', 'planned', 'planned', 'planned'][index], tags: [['measure'], ['layout'], ['cleanup'], ['maintenance'], ['organization'], ['maintenance'], ['workflow'], ['shopping'], ['lighting'], ['organization'], ['inventory'], ['shopping'], ['someday'], ['inventory'], ['photo']][index], addedAt: da(34 - index * 2), updatedAt: da((index % 6) + 1), reminderAt: index === 3 ? df(14) : undefined })),
  ];

  const kitchenEntries = [
    linkedEntry('Coffee Station', IDS.coffeeHome, { status: 'active', tags: ['coffee'], notes: 'Visible zone worth overthinking.', customFields: [{ title: 'Owner', value: 'Justin' }, { title: 'Due Date', value: '2026-04-15' }], addedAt: da(38), updatedAt: da(1) }),
    ...batch(['Pantry bins reorder', 'Drawer organizer measurements', 'Swap under-cabinet bulbs to warmer temp', 'Deep clean fridge seals', 'Knife block declutter', 'Replace two chipped bowls', 'Create overflow paper goods zone', 'Inspect dishwasher filter cadence', 'Mount magnetic recipe holder', 'Add one charging spot for tablet timer', 'Review backup pantry inventory labels', 'Decide compost caddy position', 'Rehome rarely used serving platters', 'Measure rug replacement options', 'Take after photos for apartment binder'], (index) => ({ status: ['planned', 'completed', 'planned', 'planned', 'completed', 'planned', 'active', 'completed', 'planned', 'planned', 'active', 'planned', 'completed', 'planned', 'planned'][index], tags: [['storage'], ['prep'], ['lighting'], ['maintenance'], ['declutter'], ['shopping'], ['organization'], ['maintenance'], ['small-win'], ['tech'], ['inventory'], ['workflow'], ['declutter'], ['decor'], ['photo']][index], addedAt: da(29 - index), updatedAt: da((index % 6) + 1), reminderAt: index === 3 ? df(9) : undefined })),
  ];

  const homeEntries = [
    linkedEntry('Kitchen Refresh', IDS.kitchen, { status: 'active', tags: ['kitchen'], notes: 'Biggest current home bucket.', customFields: [{ title: 'Owner', value: 'Justin' }, { title: 'Budget', value: '1200', format: 'numbers' }], addedAt: da(45), updatedAt: da(1) }),
    ...batch(['Entryway gallery wall phase 2', 'Home office cable cleanup', 'Garage storage reset', 'Guest room bedding upgrade', 'Quarterly emergency kit audit', 'Smart home naming cleanup', 'Spring maintenance checklist', 'Paint sample wall touchups', 'Deep storage purge', 'Outdoor lighting battery cycle', 'Tool wall labeling pass', 'Annual subscriptions and warranties binder', 'Window treatment measurements', 'Seasonal donation haul', 'Replace hallway air filter schedule card'], (index) => ({ status: ['planned', 'active', 'planned', 'planned', 'completed', 'planned', 'active', 'planned', 'planned', 'completed', 'planned', 'planned', 'planned', 'active', 'completed'][index], tags: [['decor'], ['desk'], ['storage'], ['comfort'], ['safety'], ['tech'], ['maintenance'], ['paint'], ['declutter'], ['outdoor'], ['garage'], ['admin'], ['decor'], ['declutter'], ['maintenance']][index], addedAt: da(21 - index), updatedAt: da((index % 6) + 1), reminderAt: index === 6 ? df(6) : undefined })),
  ];

  const tierNames = {
    s: ['CAVA', 'Los Tacos No. 1', 'Prince Street Pizza', "Xi'an Famous Foods", 'KazuNori', "Joe's Steam Rice Roll", 'Mala Project', '7th Street Burger', 'Thai Diner', "L'Industrie Pizzeria", 'Raku', 'Misi', 'Lilia', 'Via Carota', 'Sappe', 'Birria-Landia'],
    a: ['Sweetgreen', 'Chipotle', 'Shake Shack', 'Han Dynasty', 'Mamouns', "Vanessa's Dumpling House", 'Nami Nori', "Mighty Quinn's", 'Emily', 'Rubirosa', 'Cocoron', 'TabeTomo', 'Saiguette', 'Superiority Burger', 'Win Son Bakery', 'Pizzeria Delfina'],
    b: ['Panera Bread', 'Five Guys', "Domino's", 'Cava Mezze Grill', 'Noodles & Company', 'Just Salad', 'Dos Toros', 'Dig', 'Westville', 'Teriyaki Madness', 'Bareburger', "Luke's Lobster", 'Blue Ribbon Fried Chicken', "Sticky's", 'The Halal Guys', 'Chopt'],
    c: ['Sbarro', "Applebee's delivery", 'Random ghost kitchen wings', 'Airport sushi rolls', 'Cold pad thai leftovers', 'Mushy poke chain', 'Pizza chain experimental crust', 'Sad office cafeteria wrap', 'Late-night dry tacos', 'Mystery bodega Caesar', 'Overcooked burger special', 'Day-old dumplings', 'Soggy fries combo', 'Microwave mac and cheese bowl', 'Mystery combo platter', 'Wilted salad delivery'],
  };

  const tierList = (names, mode) => batch(names, (index) => ({ status: 'completed', tags: mode === 's' ? [index % 2 === 0 ? 'go-to' : 'group-order'] : mode === 'a' ? [index % 2 ? 'reliable' : 'weekday'] : mode === 'b' ? [index % 3 === 0 ? 'fine' : ''] : [index % 4 === 0 ? 'avoid' : ''], notes: mode === 'c' && index % 5 === 0 ? 'Only under duress.' : mode === 's' && index % 5 === 0 ? 'Never misses.' : undefined, addedAt: da(180 - index * 2), updatedAt: da((index % 9) + 1) }));

  const boardEntries = [
    linkedEntry('S Tier', IDS.s, { tags: ['top-tier'], addedAt: da(90), updatedAt: da(2) }),
    linkedEntry('A Tier', IDS.a, { tags: ['strong'], addedAt: da(90), updatedAt: da(2) }),
    linkedEntry('B Tier', IDS.b, { tags: ['situational'], addedAt: da(90), updatedAt: da(2) }),
    linkedEntry('C Tier', IDS.c, { tags: ['avoid'], addedAt: da(90), updatedAt: da(2) }),
    ...batch(['Office lunch rotation notes', 'Date-night delivery short list', 'Post-gym burrito lane', 'Rainy-day comfort orders', 'Group order crowd-pleasers', 'Neighborhood lunch under $15', 'Late-night options after events', 'Coffee + pastry emergency stops', 'Weekend brunch queue risk list', 'New openings to sample', 'Do not reorder without coupons', 'Friends favorites map'], (index) => ({ tags: [['ops'], ['date-night'], ['routine'], ['weather'], ['group-order'], ['budget'], ['late-night'], ['coffee'], ['brunch'], ['try-soon'], ['budget'], ['people']][index], addedAt: da(15 - index), updatedAt: da((index % 4) + 1) })),
  ];

  const archivedReadingEntries = [
    ...readingEntries.slice(0, 8).map((item, index) => ({ ...item, id: `${item.id}-a-${index}`, status: 'completed', progress: { current: 100, total: 100, unit: 'percent', updatedAt: da(300 - index * 8) }, addedAt: da(500 - index * 20), updatedAt: da(300 - index * 8) })),
    ...readingEntries.slice(8, 16).map((item, index) => ({ ...item, id: `${item.id}-m-${index}`, status: 'completed', progress: { current: item.totalChapters || 100, total: item.totalChapters || 100, unit: item.type === 'manga' ? 'chapter' : 'percent', updatedAt: da(260 - index * 7) }, addedAt: da(460 - index * 18), updatedAt: da(260 - index * 7) })),
  ].slice(0, 16);

  const deletedGiftEntries = batch(
    ['Champion Reverse Weave Hoodie', 'Fellow Carter Move Mug', 'A24 gift card', 'Board game for family night', 'LEGO botanical set', 'Fancy olive oil box', 'Handmade ceramic ramen bowl', 'Portable battery bank', 'Brooklinen robe', 'Stationery sampler', 'Japanese snack subscription', 'Record store gift certificate', 'Film camera strap', 'Coffee subscription month', 'Wool travel socks', 'Custom photo book'],
    (index) => ({
      type: index % 3 === 0 ? 'link' : 'custom',
      productUrl: index % 3 === 0 ? 'https://www.amazon.com/' : undefined,
      price: index % 4 === 0 ? `$${20 + index * 5}.00` : undefined,
      tags: [index % 2 === 0 ? 'gift' : 'holiday'],
      addedAt: da(420 - index * 3),
      updatedAt: da(380 - index * 2),
    })
  );

  const projectConfig = config(['status', 'tags', 'notes', 'reminders', 'sublists', 'custom-fields'], [field('owner', 'Owner', 'text'), field('due-date', 'Due Date', 'text'), field('budget', 'Budget', 'number')]);
  const trackingConfig = config(['status', 'progress', 'rating', 'tags', 'notes', 'reminders', 'cover', 'custom-fields', 'compare'], [field('creator', 'Creator', 'text'), field('format', 'Format', 'text'), field('pages', 'Pages', 'number')]);
  const wishlistConfig = config(['status', 'tags', 'notes', 'links', 'cover', 'custom-fields', 'compare'], [field('store', 'Store', 'text'), field('target-price', 'Target Price', 'number'), field('why', 'Why', 'text')], 'link');
  const toggleConfig = config(['toggle', 'tags', 'notes', 'custom-fields'], [field('prep-minutes', 'Prep Minutes', 'number'), field('servings', 'Servings', 'number')]);
  const healthConfig = config(['status', 'tags', 'notes', 'reminders', 'custom-fields'], [field('owner', 'Owner', 'text'), field('cadence', 'Cadence', 'text')]);
  const tierConfig = config(['sublists', 'tier', 'tags', 'notes']);
  const browseConfig = config(['tags', 'notes', 'links', 'custom-fields'], [field('neighborhood', 'Neighborhood', 'text'), field('priority', 'Priority', 'number')]);
  const lists = [
    list(IDS.watch, 'Watch Queue', watchEntries, { description: 'Power-user cross-media queue.', tags: ['media', 'streaming'], preset: 'tracking', config: trackingConfig, preferences: prefs({ viewMode: 'grid', groupMode: 'status' }), pinned: true, createdAt: da(120), updatedAt: da(1) }),
    list(IDS.read, 'Reading Stack', readingEntries, { description: 'Books and manga with progress and compare fields.', tags: ['reading', 'backlog'], preset: 'tracking', config: trackingConfig, preferences: prefs({ viewMode: 'compare', sortMode: 'rating-desc' }), pinned: true, createdAt: da(150), updatedAt: da(1) }),
    list(IDS.wish, 'Wishlist', wishlistEntries, { description: 'Real products and maybe-buys.', tags: ['shopping'], config: wishlistConfig, preferences: prefs({ viewMode: 'compare' }), createdAt: da(70), updatedAt: da(1) }),
    list(IDS.meal, 'Meal Rotation', mealEntries, { description: 'Weeknight cooking rotation.', tags: ['food', 'home'], config: toggleConfig, preferences: prefs({ sortMode: 'title-asc' }), createdAt: da(80), updatedAt: da(1) }),
    list(IDS.fit, 'Fitness & Health System', fitnessEntries, { description: 'Training blocks and upkeep.', tags: ['health'], config: healthConfig, preferences: prefs({ groupMode: 'status' }), createdAt: da(65), updatedAt: da(1) }),
    list(IDS.career, 'Career & Learning Radar', [...readingEntries.slice(3, 5), ...batch(['Ship tracker compare mode polish', 'Refactor catalog search loading states', 'Prepare Q2 roadmap draft', 'Write architecture note for Convex sync model', 'Review onboarding metrics instrumentation', 'Watch React Conf notes backfill', 'Audit EAS release checklist', 'Build product-import smoke test matrix', 'Read Expo SDK 55 notes closely', 'Update portfolio case-study screenshots', 'Reach out to two former teammates', 'Review taxes for freelance buffer', 'Update speaking topics note', 'Clean up GitHub pinned repos'], (index) => ({ type: index === 5 || index === 8 ? 'link' : 'custom', status: ['active', 'planned', 'active', 'planned', 'planned', 'planned', 'completed', 'active', 'completed', 'planned', 'planned', 'planned', 'planned', 'completed'][index], tags: [['product'], ['frontend'], ['planning'], ['docs'], ['analytics'], ['frontend'], ['release'], ['qa'], ['expo'], ['career'], ['networking'], ['finance'], ['writing'], ['career']][index], productUrl: index === 5 ? 'https://react.dev/' : index === 8 ? 'https://docs.expo.dev/' : undefined, addedAt: da(22 - index), updatedAt: da((index % 5) + 1), reminderAt: index === 10 ? df(3, 10) : undefined, customFields: index === 0 ? [{ title: 'Owner', value: 'Justin' }, { title: 'Due', value: '2026-03-22' }] : undefined }))], { description: 'Product work and career upkeep.', tags: ['career', 'learning'], preset: 'tracking', config: config(['status', 'progress', 'rating', 'tags', 'notes', 'reminders', 'links', 'custom-fields', 'compare'], [field('owner', 'Owner', 'text'), field('due', 'Due', 'text')]), preferences: prefs({ viewMode: 'compare', groupMode: 'status' }), pinned: true, createdAt: da(55), updatedAt: da(1) }),
    list(IDS.travel, 'Travel Planning Hub', travelEntries, { description: 'High-level travel stack.', tags: ['travel'], config: projectConfig, preferences: prefs({ groupMode: 'status' }), pinned: true, createdAt: da(90), updatedAt: da(1) }),
    list(IDS.japan, 'Japan 2027', japanEntries, { description: 'Long-haul trip planning.', tags: ['travel', 'japan'], config: projectConfig, preferences: prefs({ groupMode: 'status' }), parentListId: IDS.travel, createdAt: da(85), updatedAt: da(1) }),
    list(IDS.tokyo, 'Tokyo Week', tokyoEntries, { description: 'Tokyo operating plan.', tags: ['travel', 'tokyo'], config: projectConfig, preferences: prefs({ groupMode: 'status' }), parentListId: IDS.japan, createdAt: da(75), updatedAt: da(1) }),
    list(IDS.coffeeTrip, 'Tokyo Coffee Crawl', coffeeTripEntries, { description: 'Coffee sublist for Tokyo.', tags: ['travel', 'coffee'], config: browseConfig, preferences: prefs({ viewMode: 'compare' }), parentListId: IDS.tokyo, createdAt: da(70), updatedAt: da(1) }),
    list(IDS.home, 'Home Projects Hub', homeEntries, { description: 'Apartment and maintenance board.', tags: ['home'], config: projectConfig, preferences: prefs({ groupMode: 'status' }), pinned: true, createdAt: da(88), updatedAt: da(1) }),
    list(IDS.kitchen, 'Kitchen Refresh', kitchenEntries, { description: 'Kitchen branch of the home stack.', tags: ['home', 'kitchen'], config: projectConfig, preferences: prefs({ groupMode: 'status' }), parentListId: IDS.home, createdAt: da(74), updatedAt: da(1) }),
    list(IDS.coffeeHome, 'Coffee Station', coffeeHomeEntries, { description: 'Coffee corner planning.', tags: ['home', 'coffee'], config: projectConfig, preferences: prefs({ groupMode: 'status' }), parentListId: IDS.kitchen, createdAt: da(68), updatedAt: da(1) }),
    list(IDS.grinder, 'Grinder Research', grinderEntries, { description: 'Deep grinder decision lane.', tags: ['coffee', 'research'], config: wishlistConfig, preferences: prefs({ viewMode: 'compare' }), parentListId: IDS.coffeeHome, createdAt: da(64), updatedAt: da(1) }),
    list(IDS.tier, 'Takeout Tier Board', boardEntries, { description: 'Food ranking board.', tags: ['food', 'tier'], config: tierConfig, preferences: prefs({ viewMode: 'tier' }), createdAt: da(95), updatedAt: da(1) }),
    list(IDS.s, 'S Tier', tierList(tierNames.s, 's'), { description: 'Favorites that rarely disappoint.', tags: ['food'], config: config(['tags', 'notes']), preferences: prefs({ sortMode: 'title-asc' }), parentListId: IDS.tier, createdAt: da(94), updatedAt: da(1) }),
    list(IDS.a, 'A Tier', tierList(tierNames.a, 'a'), { description: 'Reliable regulars.', tags: ['food'], config: config(['tags', 'notes']), preferences: prefs({ sortMode: 'title-asc' }), parentListId: IDS.tier, createdAt: da(94), updatedAt: da(1) }),
    list(IDS.b, 'B Tier', tierList(tierNames.b, 'b'), { description: 'Convenient and situational.', tags: ['food'], config: config(['tags', 'notes']), preferences: prefs({ sortMode: 'title-asc' }), parentListId: IDS.tier, createdAt: da(94), updatedAt: da(1) }),
    list(IDS.c, 'C Tier', tierList(tierNames.c, 'c'), { description: 'Retained mostly as warnings.', tags: ['food'], config: config(['tags', 'notes']), preferences: prefs({ sortMode: 'title-asc' }), parentListId: IDS.tier, createdAt: da(94), updatedAt: da(1) }),
  ];

  const deletedLists = [
    list(IDS.arch, '2025 Reading Challenge', archivedReadingEntries, { description: 'Previous-year archive.', tags: ['archive', 'reading'], preset: 'tracking', config: trackingConfig, preferences: prefs({ viewMode: 'compare', sortMode: 'rating-desc' }), archivedAt: da(120), createdAt: da(500), updatedAt: da(120) }),
    list(IDS.del, 'Gift Ideas 2025', deletedGiftEntries, { description: 'Old holiday list intentionally deleted.', tags: ['deleted', 'gifts'], config: wishlistConfig, preferences: prefs({ viewMode: 'compare' }), deletedAt: da(95), createdAt: da(420), updatedAt: da(95) }),
  ];

  const savedTemplates = [
    template('template-user-trip-operating-system', 'Trip Operating System', 'Statuses, reminders, and custom fields for travel planning.', 'blank', projectConfig, [{ title: 'Flights and points', type: 'custom', status: 'planned', tags: ['travel'] }, { title: 'Neighborhood shortlist', type: 'custom', status: 'planned', tags: ['travel'] }, { title: 'Reservation deadlines', type: 'custom', status: 'planned', tags: ['travel'] }]),
    template('template-user-decision-board', 'Decision Board', 'Compare-friendly list for research-heavy choices.', 'blank', wishlistConfig, [{ title: 'Option A', type: 'link', tags: ['research'] }, { title: 'Option B', type: 'link', tags: ['research'] }]),
    template('template-user-weekly-review', 'Weekly Review Stack', 'Light operational template for recurring weekly resets.', 'blank', config(['toggle', 'status', 'tags', 'notes', 'custom-fields'], [field('owner', 'Owner', 'text')]), [{ title: 'Calendar cleanup', type: 'custom', checked: false, status: 'planned' }, { title: 'Budget glance', type: 'custom', checked: false, status: 'planned' }, { title: 'Meal plan', type: 'custom', checked: false, status: 'planned' }]),
  ];

  const itemUserDataByKey = {
    [`anime:${anime[0].mal_id}`]: { tags: ['favorite', 'prestige-fantasy'], notes: 'Would buy the soundtrack instantly.', rating: 10, customFields: [], progress: { current: 21, total: anime[0].episodes || 28, unit: 'episode', updatedAt: da(1) }, updatedAt: da(1) },
    [`tv:${tmdbResults[0].id}`]: { tags: ['wait-for-batch'], notes: 'Best watched in chunks.', customFields: [], updatedAt: da(2) },
    [`tv:${tmdbResults[1].id}`]: { tags: ['rewatch-core'], notes: 'Carmy stress level remains too real.', rating: 9, customFields: [], progress: { current: 18, total: 18, unit: 'episode', updatedAt: da(4) }, updatedAt: da(4) },
    [`movie:${tmdbResults[4].id}`]: { tags: ['theater-memory'], notes: 'Need one more home rewatch.', rating: 9, customFields: [], updatedAt: da(9) },
    [`book:${books[0].id}`]: { tags: ['reference-book'], notes: 'Worth keeping near the desk.', rating: 9, customFields: [{ title: 'Revisit', value: 'Every quarter', format: 'text' }], progress: { current: 42, total: 100, unit: 'percent', updatedAt: da(2) }, updatedAt: da(2) },
    [`book:${books[6].id}`]: { tags: ['career'], notes: 'Read next when energy is technical.', rating: 9, customFields: [], updatedAt: da(2) },
    [`manga:${manga[0].mal_id}`]: { tags: ['beautiful-art'], notes: 'Easy manga to evangelize.', rating: 9, customFields: [], progress: { current: 64, unit: 'chapter', updatedAt: da(1) }, updatedAt: da(1) },
    [`manga:${manga[1].mal_id}`]: { tags: ['marathon'], notes: 'Not dropped, just pacing.', rating: 10, customFields: [], progress: { current: 1112, unit: 'chapter', updatedAt: da(10) }, updatedAt: da(10) },
  };

  const seed = {
    lists,
    deletedLists,
    savedTemplates,
    itemUserDataByKey,
    recentSearches: ['frieren', 'project hail mary', 'tokyo coffee', 'dune part two', 'mx master 3s', 'witch hat atelier', 'andor', 'ode grinder'],
    recentListIds: [IDS.watch, IDS.read, IDS.career, IDS.travel, IDS.home, IDS.tier, IDS.wish, IDS.japan, IDS.tokyo, IDS.coffeeHome],
  };

  fs.writeFileSync(OUT, JSON.stringify(seed, null, 2) + '\n', 'utf8');
  const entryCount = lists.reduce((sum, item) => sum + item.entries.length, 0) + deletedLists.reduce((sum, item) => sum + item.entries.length, 0);
  console.log(`Wrote ${path.relative(ROOT, OUT)} with ${lists.length} active lists, ${deletedLists.length} deleted/archived lists, and ${entryCount} total entries.`);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
