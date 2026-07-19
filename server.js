/**
 * GOE — Global Ontology Engine | Backend Intelligence Server
 * Fetches live news from Indian RSS sources, extracts entities via NLP,
 * computes India scores, detects threats, and serves everything to the frontend.
 *
 * Run: node server.js
 * Serves on: http://localhost:3001
 */

const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { parseStringPromise } = require('xml2js');
const nlp = require('compromise');
try { require('dotenv').config(); } catch (e) { /* ignore */ }

const app = express();
const PORT = process.env.PORT || 3001;

const path = require('path');
app.use(cors());
app.use(express.json());
// Crucial for Vercel: serve static frontend files instantly when root is requested
app.use(express.static(__dirname));

// Map the root domain explicitly to the dashboard UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ═══════════════════════════════════════════════════════════════
// ENTITY DICTIONARY  — NLP recognition map
// Entities: { name, type, domain, aliases[] }
// ═══════════════════════════════════════════════════════════════
const ENTITIES = [
  // Nations
  { name: 'India', type: 'nation', domain: 'geopolitics', aliases: ['Indian', 'New Delhi', 'Bharat'] },
  { name: 'China', type: 'nation', domain: 'geopolitics', aliases: ['Chinese', 'Beijing', 'PRC', "People's Republic"] },
  { name: 'Pakistan', type: 'nation', domain: 'defense', aliases: ['Pakistani', 'Islamabad', 'Lahore'] },
  { name: 'United States', type: 'nation', domain: 'geopolitics', aliases: ['USA', 'US', 'American', 'Washington', 'Biden', 'Trump'] },
  { name: 'Russia', type: 'nation', domain: 'geopolitics', aliases: ['Russian', 'Moscow', 'Kremlin', 'Putin'] },
  { name: 'Japan', type: 'nation', domain: 'geopolitics', aliases: ['Japanese', 'Tokyo'] },
  { name: 'Australia', type: 'nation', domain: 'geopolitics', aliases: ['Australian', 'Canberra'] },
  { name: 'Israel', type: 'nation', domain: 'defense', aliases: ['Israeli', 'Tel Aviv', 'Jerusalem'] },
  { name: 'Iran', type: 'nation', domain: 'geopolitics', aliases: ['Iranian', 'Tehran'] },
  { name: 'Saudi Arabia', type: 'nation', domain: 'economics', aliases: ['Saudi', 'Riyadh', 'OPEC'] },
  { name: 'UAE', type: 'nation', domain: 'economics', aliases: ['Emirates', 'Dubai', 'Abu Dhabi'] },
  { name: 'France', type: 'nation', domain: 'geopolitics', aliases: ['French', 'Paris', 'Macron'] },
  { name: 'Germany', type: 'nation', domain: 'geopolitics', aliases: ['German', 'Berlin'] },
  { name: 'UK', type: 'nation', domain: 'geopolitics', aliases: ['Britain', 'British', 'London', 'Sunak'] },
  { name: 'Sri Lanka', type: 'nation', domain: 'geopolitics', aliases: ['Sri Lankan', 'Colombo'] },
  { name: 'Nepal', type: 'nation', domain: 'geopolitics', aliases: ['Nepali', 'Kathmandu'] },
  { name: 'Bangladesh', type: 'nation', domain: 'geopolitics', aliases: ['Bangladeshi', 'Dhaka'] },
  { name: 'Myanmar', type: 'nation', domain: 'geopolitics', aliases: ['Burma', 'Burmese', 'Naypyidaw'] },
  { name: 'Afghanistan', type: 'nation', domain: 'defense', aliases: ['Afghan', 'Kabul', 'Taliban'] },
  { name: 'Ukraine', type: 'nation', domain: 'geopolitics', aliases: ['Ukrainian', 'Kyiv', 'Zelenskyy'] },
  { name: 'North Korea', type: 'nation', domain: 'defense', aliases: ['DPRK', 'Pyongyang', 'Kim Jong'] },
  { name: 'South Korea', type: 'nation', domain: 'technology', aliases: ['Korean', 'Seoul'] },
  { name: 'Turkey', type: 'nation', domain: 'geopolitics', aliases: ['Turkish', 'Ankara', 'Erdogan'] },
  { name: 'Brazil', type: 'nation', domain: 'economics', aliases: ['Brazilian', 'Brasilia'] },

  // Organizations
  { name: 'QUAD', type: 'organization', domain: 'geopolitics', aliases: ['Quadrilateral', 'Quad summit'] },
  { name: 'BRICS', type: 'organization', domain: 'economics', aliases: ['BRICS+', 'BRICS summit'] },
  { name: 'SCO', type: 'organization', domain: 'geopolitics', aliases: ['Shanghai Cooperation'] },
  { name: 'NATO', type: 'organization', domain: 'defense', aliases: ['North Atlantic Treaty'] },
  { name: 'UN', type: 'organization', domain: 'geopolitics', aliases: ['United Nations', 'UNSC', 'UN Security Council'] },
  { name: 'IMF', type: 'organization', domain: 'economics', aliases: ['International Monetary Fund'] },
  { name: 'World Bank', type: 'organization', domain: 'economics', aliases: ['World Bank Group'] },
  { name: 'WTO', type: 'organization', domain: 'economics', aliases: ['World Trade Organization'] },
  { name: 'G20', type: 'organization', domain: 'geopolitics', aliases: ['G-20', 'G 20', 'Group of 20'] },
  { name: 'G7', type: 'organization', domain: 'geopolitics', aliases: ['G-7', 'Group of 7'] },
  { name: 'ASEAN', type: 'organization', domain: 'geopolitics', aliases: ['Southeast Asian Nations'] },
  { name: 'ISRO', type: 'organization', domain: 'technology', aliases: ['Indian Space Research'] },
  { name: 'DRDO', type: 'organization', domain: 'defense', aliases: ['Defence Research Development'] },
  { name: 'Reserve Bank of India', type: 'organization', domain: 'economics', aliases: ['RBI', 'Reserve Bank'] },
  { name: 'Indian Armed Forces', type: 'organization', domain: 'defense', aliases: ['Indian Army', 'Indian Navy', 'Indian Air Force', 'IAF', 'BSF'] },
  { name: 'PLA', type: 'organization', domain: 'defense', aliases: ["People's Liberation Army", 'PLA Navy', 'PLAN'] },
  { name: 'ISI', type: 'organization', domain: 'defense', aliases: ['Inter-Services Intelligence', 'Pakistan ISI'] },
  { name: 'NPCI', type: 'organization', domain: 'technology', aliases: ['National Payments Corporation'] },
  { name: 'African Union', type: 'organization', domain: 'geopolitics', aliases: ['AU', 'African nations'] },
  { name: 'EU', type: 'organization', domain: 'economics', aliases: ['European Union', 'European Commission'] },
  { name: 'OPEC', type: 'organization', domain: 'economics', aliases: ['OPEC+', 'oil cartel'] },
  { name: 'WHO', type: 'organization', domain: 'society', aliases: ['World Health Organization'] },
  { name: 'International Solar Alliance', type: 'organization', domain: 'climate', aliases: ['ISA', 'solar alliance'] },

  // Key People
  { name: 'Narendra Modi', type: 'person', domain: 'geopolitics', aliases: ['PM Modi', 'Modi government', 'Prime Minister Modi'] },
  { name: 'Xi Jinping', type: 'person', domain: 'geopolitics', aliases: ['President Xi', 'Xi'] },
  { name: 'Vladimir Putin', type: 'person', domain: 'geopolitics', aliases: ['Putin'] },
  { name: 'Donald Trump', type: 'person', domain: 'geopolitics', aliases: ['Trump', 'President Trump'] },
  { name: 'Rajnath Singh', type: 'person', domain: 'defense', aliases: ['Defence Minister'] },
  { name: 'S. Jaishankar', type: 'person', domain: 'geopolitics', aliases: ['Jaishankar', 'External Affairs Minister', 'EAM'] },

  // Places
  { name: 'Line of Actual Control', type: 'place', domain: 'defense', aliases: ['LAC', 'Galwan', 'Depsang', 'Doklam'] },
  { name: 'Line of Control', type: 'place', domain: 'defense', aliases: ['LoC', 'Kashmir border'] },
  { name: 'South China Sea', type: 'place', domain: 'geopolitics', aliases: ['South China Sea'] },
  { name: 'Indo-Pacific', type: 'place', domain: 'geopolitics', aliases: ['Indo Pacific', 'Asia Pacific'] },
  { name: 'Indian Ocean', type: 'place', domain: 'defense', aliases: ['IOR', 'Indian Ocean Region'] },
  { name: 'Jammu & Kashmir', type: 'place', domain: 'defense', aliases: ['J&K', 'Kashmir', 'Jammu Kashmir'] },
  { name: 'Arunachal Pradesh', type: 'place', domain: 'defense', aliases: ['Arunachal', 'South Tibet'] },
  { name: 'Andaman & Nicobar', type: 'place', domain: 'defense', aliases: ['Andaman', 'Nicobar'] },
  { name: 'Strait of Hormuz', type: 'place', domain: 'economics', aliases: ['Hormuz'] },
  { name: 'Gulf of Aden', type: 'place', domain: 'defense', aliases: ['Red Sea', 'Houthi'] },

  // Technology / Concepts
  { name: 'UPI', type: 'concept', domain: 'technology', aliases: ['Unified Payments Interface', 'digital payment'] },
  { name: 'Aadhaar', type: 'concept', domain: 'technology', aliases: ['biometric ID', 'digital identity'] },
  { name: 'BrahMos', type: 'concept', domain: 'defense', aliases: ['BrahMos missile', 'supersonic cruise'] },
  { name: 'Tejas', type: 'concept', domain: 'defense', aliases: ['Tejas LCA', 'light combat aircraft'] },
  { name: 'Agni', type: 'concept', domain: 'defense', aliases: ['Agni missile', 'ballistic missile', 'ICBM'] },
  { name: 'Semiconductor', type: 'concept', domain: 'technology', aliases: ['chips', 'chip manufacturing', 'fab', 'foundry'] },
  { name: 'Artificial Intelligence', type: 'concept', domain: 'technology', aliases: ['Artificial Intelligence', 'machine learning', 'LLM', 'ChatGPT', 'generative AI'] },
  { name: 'BRI', type: 'concept', domain: 'geopolitics', aliases: ["Belt and Road", 'OBOR', 'One Belt'] },
  { name: 'PLI Scheme', type: 'concept', domain: 'economics', aliases: ['Production Linked Incentive', 'PLI'] },
  { name: 'Cryptocurrency', type: 'concept', domain: 'economics', aliases: ['Bitcoin', 'crypto', 'blockchain', 'digital currency'] },
  { name: 'Inflation', type: 'concept', domain: 'economics', aliases: ['CPI', 'WPI', 'price rise', 'cost of living'] },
  { name: 'Climate Change', type: 'concept', domain: 'climate', aliases: ['global warming', 'climate crisis', 'carbon emissions', 'net zero', 'COP'] },
  { name: 'Solar Energy', type: 'concept', domain: 'climate', aliases: ['solar power', 'photovoltaic', 'solar panels'] },
  { name: 'Monsoon', type: 'concept', domain: 'climate', aliases: ['rainfall', 'IMD forecast', 'drought', 'flood'] },
  { name: 'Cybersecurity', type: 'concept', domain: 'technology', aliases: ['cyberattack', 'cyber warfare', 'hacking', 'data breach'] },
  { name: 'Nuclear', type: 'concept', domain: 'defense', aliases: ['nuclear weapon', 'nuclear test', 'atomic', 'warhead'] },
  { name: 'Trade War', type: 'concept', domain: 'economics', aliases: ['tariff', 'sanctions', 'trade dispute', 'import duty'] },
  { name: 'IMEC Corridor', type: 'concept', domain: 'economics', aliases: ['India-Middle East-Europe Corridor', 'IMEC'] },
  { name: 'Make in India', type: 'concept', domain: 'economics', aliases: ['Atmanirbhar', 'self-reliance', 'domestic manufacturing'] },
  { name: 'Chandrayaan', type: 'event', domain: 'technology', aliases: ['Chandrayaan-3', 'lunar mission', 'moon landing'] },
  { name: 'G20 Summit', type: 'event', domain: 'geopolitics', aliases: ['G20 presidency', 'New Delhi G20'] },
];

// ═══════════════════════════════════════════════════════════════
// RELATIONSHIP PATTERNS — verb-based relationship detection
// ═══════════════════════════════════════════════════════════════
// 24 typed relationship patterns (inspired by pipeline VERB_TO_REL_TYPE)
const RELATIONSHIP_PATTERNS = [
  { verbs: ['attack', 'strike', 'bomb', 'airstrike', 'raid', 'assault'], rel: 'ATTACKS' },
  { verbs: ['threaten', 'warn', 'ultimatum', 'standoff', 'escalat'], rel: 'THREATENS' },
  { verbs: ['invade', 'occupy', 'cross border', 'incursion'], rel: 'INVADES' },
  { verbs: ['sanction', 'ban', 'block', 'restrict', 'embargo'], rel: 'SANCTIONS' },
  { verbs: ['condemn', 'critic', 'slam', 'denounce', 'blast'], rel: 'CONDEMNS' },
  { verbs: ['oppose', 'protest', 'reject', 'object'], rel: 'OPPOSES' },
  { verbs: ['dispute', 'contest', 'claim', 'border conflict'], rel: 'DISPUTES_WITH' },
  { verbs: ['trade', 'bilateral trade', 'commerce'], rel: 'TRADES_WITH' },
  { verbs: ['export', 'ship', 'supply'], rel: 'EXPORTS_TO' },
  { verbs: ['import', 'procure', 'buy from'], rel: 'IMPORTS_FROM' },
  { verbs: ['invest', 'fund', 'finance', 'stake'], rel: 'INVESTS_IN' },
  { verbs: ['tariff', 'duty', 'levy'], rel: 'IMPOSES_TARIFF_ON' },
  { verbs: ['meet', 'summit', 'bilateral meeting', 'talk'], rel: 'MEETS_WITH' },
  { verbs: ['visit', 'state visit', 'tour'], rel: 'VISITS' },
  { verbs: ['negotiate', 'dialogue', 'discuss'], rel: 'NEGOTIATES_WITH' },
  { verbs: ['sign', 'MoU', 'pact', 'inked deal'], rel: 'SIGNS_AGREEMENT_WITH' },
  { verbs: ['agree', 'consensus', 'accord'], rel: 'AGREES_WITH' },
  { verbs: ['support', 'back', 'endorse', 'aid'], rel: 'SUPPORTS' },
  { verbs: ['ally', 'partner', 'cooperate', 'strategic partner'], rel: 'ALLIED_WITH' },
  { verbs: ['member', 'join', 'participate', 'attend summit'], rel: 'MEMBER_OF' },
  { verbs: ['launch', 'deploy', 'commission', 'inaugurate'], rel: 'ANNOUNCES' },
  { verbs: ['conflict', 'war', 'fighting', 'battle'], rel: 'IN_CONFLICT_WITH' },
  { verbs: ['supply weapon', 'arms sale', 'defence deal', 'military supply'], rel: 'ARMS_SUPPLIER_TO' },
  { verbs: ['co-mentioned', 'related'], rel: 'CO_MENTIONED' },
];

// Domain impact config — mirrors pipeline IMPACT_DOMAINS
const IMPACT_DOMAINS = {
  military: {
    label: '🛡️ Military / Security',
    keywords: ['attack', 'war', 'conflict', 'military', 'nuclear', 'missile', 'terror', 'pakistan', 'china border', 'kashmir', 'ceasefire', 'invasion', 'sanction', 'soldier', 'army', 'airstrike', 'bomb', 'weapon', 'lac', 'border'],
    negRelTypes: ['ATTACKS','THREATENS','INVADES','IN_CONFLICT_WITH','BOMBS','STRIKES','SANCTIONS'],
    color: '#e74c3c'
  },
  economic: {
    label: '💰 Economic Impact',
    keywords: ['trade', 'tariff', 'oil', 'crude', 'rupee', 'dollar', 'inflation', 'recession', 'export', 'import', 'gdp', 'stock market', 'fed', 'interest rate', 'supply chain', 'opec', 'semiconductor'],
    negRelTypes: ['TRADES_WITH','EXPORTS_TO','IMPORTS_FROM','INVESTS_IN','IMPOSES_TARIFF_ON','SANCTIONS'],
    color: '#f39c12'
  },
  diplomatic: {
    label: '🌏 Diplomatic Tension',
    keywords: ['diplomacy', 'bilateral', 'summit', 'agreement', 'treaty', 'nato', 'brics', 'g20', 'un', 'quad', 'asean', 'foreign minister', 'ambassador', 'coalition', 'expel', 'recall', 'condemn', 'tension'],
    negRelTypes: ['MEETS_WITH','VISITS','NEGOTIATES_WITH','SIGNS_AGREEMENT_WITH','CONDEMNS','OPPOSES'],
    color: '#3498db'
  },
  political: {
    label: '🏛️ Political Pressure',
    keywords: ['election', 'government', 'policy', 'parliament', 'vote', 'opposition', 'party', 'cabinet', 'minister', 'sanctions', 'pressure', 'protest', 'demand'],
    negRelTypes: ['CRITICIZES','DISPUTES_WITH','OPPOSES','SUPPORTS'],
    color: '#9b59b6'
  },
};

// Country → ISO-3 for world impact map
const COUNTRY_ISO = {
  'united states': 'USA', 'usa': 'USA', 'america': 'USA', 'trump': 'USA', 'biden': 'USA',
  'china': 'CHN', 'beijing': 'CHN', 'chinese': 'CHN', 'pla': 'CHN',
  'russia': 'RUS', 'moscow': 'RUS', 'putin': 'RUS', 'russian': 'RUS',
  'pakistan': 'PAK', 'islamabad': 'PAK', 'pakistani': 'PAK', 'isi': 'PAK',
  'united kingdom': 'GBR', 'uk': 'GBR', 'britain': 'GBR', 'london': 'GBR',
  'france': 'FRA', 'paris': 'FRA', 'macron': 'FRA',
  'germany': 'DEU', 'berlin': 'DEU',
  'japan': 'JPN', 'tokyo': 'JPN', 'japanese': 'JPN',
  'south korea': 'KOR', 'seoul': 'KOR',
  'israel': 'ISR', 'tel aviv': 'ISR', 'israeli': 'ISR',
  'iran': 'IRN', 'tehran': 'IRN', 'iranian': 'IRN',
  'saudi arabia': 'SAU', 'riyadh': 'SAU', 'saudi': 'SAU',
  'turkey': 'TUR', 'ankara': 'TUR', 'erdogan': 'TUR',
  'ukraine': 'UKR', 'kyiv': 'UKR', 'zelenskyy': 'UKR',
  'bangladesh': 'BGD', 'dhaka': 'BGD',
  'sri lanka': 'LKA', 'colombo': 'LKA',
  'nepal': 'NPL', 'kathmandu': 'NPL',
  'afghanistan': 'AFG', 'kabul': 'AFG', 'taliban': 'AFG',
  'myanmar': 'MMR', 'burma': 'MMR',
  'brazil': 'BRA', 'canada': 'CAN', 'australia': 'AUS', 'canberra': 'AUS',
  'indonesia': 'IDN', 'singapore': 'SGP', 'malaysia': 'MYS',
  'uae': 'ARE', 'dubai': 'ARE', 'abu dhabi': 'ARE',
};

// ═══════════════════════════════════════════════════════════════
// SENTIMENT WORDS
// ═══════════════════════════════════════════════════════════════
const POSITIVE_WORDS = ['growth', 'success', 'agreement', 'cooperation', 'progress', 'boost', 'ally', 'partnership', 'record', 'historic', 'milestone', 'advance', 'peace', 'deal', 'invest', 'launch', 'approve', 'achiev', 'winner', 'gain', 'rise', 'expand', 'strong', 'positive', 'improve'];
const NEGATIVE_WORDS = ['attack', 'threat', 'conflict', 'war', 'crisis', 'tension', 'sanctions', 'dispute', 'protest', 'death', 'violence', 'terror', 'bomb', 'crash', 'fail', 'loss', 'decline', 'risk', 'warning', 'danger', 'condemn', 'arrested', 'killed', 'clashes', 'broke'];
const DOMAIN_KEYWORDS = {
  defense:     ['military', 'army', 'navy', 'air force', 'missile', 'weapon', 'war', 'soldier', 'LAC', 'border', 'terror', 'attack', 'nuclear', 'defense', 'security', 'DRDO', 'BrahMos'],
  economics:   ['GDP', 'economy', 'trade', 'export', 'import', 'inflation', 'rupee', 'market', 'finance', 'bank', 'investment', 'budget', 'fund'],
  geopolitics: ['diplomatic', 'summit', 'bilateral', 'foreign policy', 'minister', 'geopolitics', 'alliance', 'sanction', 'UN', 'G20', 'BRICS', 'relations'],
  technology:  ['technology', 'digital', 'AI', 'space', 'ISRO', 'cyber', 'semiconductor', 'startup', 'UPI', 'data', 'software'],
  climate:     ['climate', 'environment', 'monsoon', 'flood', 'drought', 'renewable', 'solar', 'emission', 'carbon', 'pollution', 'weather'],
  society:     ['election', 'protest', 'education', 'health', 'population', 'religion', 'culture', 'social', 'poverty'],
};

// ═══════════════════════════════════════════════════════════════
// RSS FEED SOURCES — all major Indian news outlets
// ═══════════════════════════════════════════════════════════════
const RSS_FEEDS = [
  // Indian National News
  { name: 'Times of India',       url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' },
  { name: 'Times of India India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms' },
  { name: 'NDTV Top Stories',     url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },
  { name: 'NDTV India',           url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
  { name: 'The Hindu',            url: 'https://www.thehindu.com/feeder/default.rss' },
  { name: 'The Hindu National',   url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { name: 'Economic Times',       url: 'https://economictimes.indiatimes.com/rssfeedsdefault.cms' },
  { name: 'ET Economy',           url: 'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms' },
  { name: 'Indian Express',       url: 'https://indianexpress.com/feed/' },
  { name: 'Indian Express India', url: 'https://indianexpress.com/section/india/feed/' },
  { name: 'Indian Express Politics', url: 'https://indianexpress.com/section/political-pulse/feed/' },
  { name: 'Hindustan Times',      url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml' },
  { name: 'HT Politics',          url: 'https://www.hindustantimes.com/feeds/rss/politics/rssfeed.xml' },
  { name: 'LiveMint',             url: 'https://www.livemint.com/rss/news' },
  { name: 'LiveMint Economy',     url: 'https://www.livemint.com/rss/economy' },
  { name: 'Business Standard',    url: 'https://www.business-standard.com/rss/home_page_top_stories.rss' },
  { name: 'BS Economy',           url: 'https://www.business-standard.com/rss/economy-policy-10603.rss' },
  { name: 'The Wire',             url: 'https://thewire.in/feed' },
  { name: 'Scroll India',         url: 'https://scroll.in/feed' },
  { name: 'India Today',          url: 'https://www.indiatoday.in/rss/1206578' },
  { name: 'News18 Politics',      url: 'https://www.news18.com/rss/politics.xml' },
  { name: 'ANI News',             url: 'https://aninews.in/rss/' },
  // International
  { name: 'BBC World',            url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'BBC Asia',             url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml' },
  { name: 'BBC Business',         url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { name: 'BBC Technology',       url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { name: 'Al Jazeera',           url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'CNN World',            url: 'http://rss.cnn.com/rss/cnn_world.rss' },
  { name: 'Guardian World',       url: 'https://www.theguardian.com/world/rss' },
  { name: 'Reuters',              url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best' },
  { name: 'TechCrunch',           url: 'https://techcrunch.com/feed/' },
  { name: 'NASA',                 url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
];

// ═══════════════════════════════════════════════════════════════
// UTILITY: HTTP/HTTPS fetch
// ═══════════════════════════════════════════════════════════════
function fetchUrl(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'GOE-Bot/1.0 (India Strategic Intelligence Dashboard)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      timeout: timeoutMs
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.setTimeout(timeoutMs);
  });
}

// ═══════════════════════════════════════════════════════════════
// NLP: Extract entities from text
// ═══════════════════════════════════════════════════════════════
function extractEntities(text) {
  const found = new Map();
  const lower = text.toLowerCase();
  
  // 1. Hardcoded Dictionary Match
  for (const entity of ENTITIES) {
    const allTerms = [entity.name, ...(entity.aliases || [])];
    for (const term of allTerms) {
      if (term.length <= 1) continue; // safety block against raw single letters
      // We must use strict word boundaries \b to prevent partial matches!
      // Example: 'US' must not match 'abuses', 'UN' must not match 'University'
      let isMatch = false;
      try {
        const regex = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        isMatch = regex.test(text);
      } catch {
        // Fallback for special characters that fail boundary logic
        isMatch = lower.includes(" " + term.toLowerCase() + " ");
      }
      
      if (isMatch) {
        if (!found.has(entity.name)) found.set(entity.name, { ...entity });
        break;
      }
    }
  }

  // 2. Dynamic NLP Extraction (Compromise.js)
  try {
    const doc = nlp(text);
    
    // Extract dynamic people
    doc.people().out('array').forEach(person => {
      // Clean and title-case
      const name = person.replace(/[^\w\s-]/g, '').trim().replace(/\b\w/g, c => c.toUpperCase());
      if (name.length > 3 && !found.has(name) && !ENTITIES.some(e => e.name === name || (e.aliases && e.aliases.includes(name)))) {
        found.set(name, { name: name, type: 'person', domain: 'geopolitics' }); // Default domain
      }
    });

    // Extract dynamic organizations
    doc.organizations().out('array').forEach(org => {
      const name = org.replace(/[^\w\s-]/g, '').trim().replace(/\b\w/g, c => c.toUpperCase());
      if (name.length > 3 && !found.has(name) && !ENTITIES.some(e => e.name === name || (e.aliases && e.aliases.includes(name)))) {
        found.set(name, { name: name, type: 'organization', domain: 'economics' }); // Default varying domain
      }
    });

    // Extract dynamic places
    doc.places().out('array').forEach(place => {
      const name = place.replace(/[^\w\s-]/g, '').trim().replace(/\b\w/g, c => c.toUpperCase());
      if (name.length > 3 && !found.has(name) && !ENTITIES.some(e => e.name === name || (e.aliases && e.aliases.includes(name)))) {
        found.set(name, { name: name, type: 'place', domain: 'geopolitics' }); 
      }
    });

  } catch(e) {
    console.error('NLP processing error:', e.message);
  }

  return [...found.values()];
}

// ═══════════════════════════════════════════════════════════════
// NLP: Compute sentiment score (0-100, 50=neutral)
// ═══════════════════════════════════════════════════════════════
function computeSentiment(text) {
  const lower = text.toLowerCase();
  let pos = 0, neg = 0;
  POSITIVE_WORDS.forEach(w => { if (lower.includes(w)) pos++; });
  NEGATIVE_WORDS.forEach(w => { if (lower.includes(w)) neg++; });
  const total = pos + neg || 1;
  return Math.round(50 + ((pos - neg) / total) * 40);
}

// ═══════════════════════════════════════════════════════════════
// NLP: Detect domain from text
// ═══════════════════════════════════════════════════════════════
function detectDomain(text) {
  const lower = text.toLowerCase();
  let best = 'geopolitics', bestScore = 0;
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = domain; }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════
// NLP: Infer relationships between entity pairs
// ═══════════════════════════════════════════════════════════════
function inferRelationships(entities, text) {
  const rels = [];
  const lower = text.toLowerCase();
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      for (const pattern of RELATIONSHIP_PATTERNS) {
        if (pattern.verbs.some(v => lower.includes(v))) {
          rels.push({
            source: entities[i].name,
            target: entities[j].name,
            relationship: pattern.rel,
            confidence: 55 + Math.floor(Math.random() * 30)
          });
          break;
        }
      }
      // Default co-occurrence relationship
      if (rels.length === 0) {
        rels.push({
          source: entities[i].name,
          target: entities[j].name,
          relationship: 'co_mentioned',
          confidence: 45
        });
      }
    }
  }
  return rels.slice(0, 5); // Max 5 relationships per article
}

// ═══════════════════════════════════════════════════════════════
// NLP: Compute threat level from article
// ═══════════════════════════════════════════════════════════════
function computeThreatLevel(text, sentiment) {
  const lower = text.toLowerCase();
  let level = 100 - sentiment; // High negativity → high threat
  const highThreatKeywords = ['attack', 'war', 'missile', 'nuclear', 'terror', 'crisis', 'killed', 'bomb', 'shootout', 'standoff', 'escalation'];
  highThreatKeywords.forEach(k => { if (lower.includes(k)) level = Math.min(95, level + 12); });
  return Math.min(95, Math.max(5, level));
}

// ═══════════════════════════════════════════════════════════════
// THREAT DETECTION: Generate threats from processed articles
// ═══════════════════════════════════════════════════════════════
function detectThreats(articles) {
  const threatClusters = new Map();

  articles
    .filter(a => a.threatLevel >= 55)
    .forEach(article => {
      const key = article.domain + ':' + (article.entities[0]?.name || 'unknown');
      if (!threatClusters.has(key)) {
        threatClusters.set(key, {
          name: generateThreatName(article),
          severity: article.threatLevel >= 75 ? 'HIGH' : article.threatLevel >= 55 ? 'MEDIUM' : 'LOW',
          domain: article.domain,
          entities: article.entities.map(e => e.name).slice(0, 4),
          confidence: Math.min(90, 50 + Math.floor(article.threatLevel / 2)),
          description: article.title || article.insight,
          source: article.source,
          publishedAt: article.publishedAt,
          actions: generateActions(article.domain, article.entities),
          articleCount: 1
        });
      } else {
        const t = threatClusters.get(key);
        t.articleCount++;
        t.confidence = Math.min(92, t.confidence + 3);
        if (t.severity === 'MEDIUM' && article.threatLevel >= 75) t.severity = 'HIGH';
      }
    });

  return [...threatClusters.values()]
    .sort((a, b) => (b.confidence) - (a.confidence))
    .slice(0, 8);
}

function generateThreatName(article) {
  const entities = article.entities.slice(0, 2).map(e => e.name).join(' — ');
  const domainLabel = { defense: 'Security', economics: 'Economic', geopolitics: 'Diplomatic', technology: 'Technology', climate: 'Climate', society: 'Social' }[article.domain] || 'Strategic';
  return `${domainLabel} Alert: ${entities || article.domain}`;
}

function generateActions(domain, entities) {
  const actionMap = {
    defense: ['Heighten border surveillance', 'Brief NSC sub-committee', 'Review forward deployment posture'],
    economics: ['Monitor exchange rate volatility', 'Brief Finance Ministry', 'Assess supply chain impact'],
    geopolitics: ['Initiate diplomatic back-channel', 'Review bilateral engagement calendar', 'Issue demarche if required'],
    technology: ['Audit critical infrastructure exposure', 'Brief CERT-In', 'Review tech import dependencies'],
    climate: ['Activate disaster management protocols', 'Issue early-warning advisories', 'Review agricultural contingencies'],
    society: ['Monitor social sentiment', 'Engage stakeholder groups', 'Review communications strategy'],
  };
  return (actionMap[domain] || actionMap.geopolitics);
}

// ═══════════════════════════════════════════════════════════════
// INDIA SCORE: Compute from articles
// ═══════════════════════════════════════════════════════════════
function computeIndiaScore(articles) {
  const domainSentiments = { military: [], economic: [], diplomatic: [], tech: [], climate: [], social: [] };
  const domainMap = { defense: 'military', economics: 'economic', geopolitics: 'diplomatic', technology: 'tech', climate: 'climate', society: 'social' };

  articles.forEach(a => {
    const key = domainMap[a.domain];
    if (key) domainSentiments[key].push(a.sentiment);
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 55;

  const scores = {
    military:   Math.max(30, Math.min(85, avg(domainSentiments.military))),
    economic:   Math.max(35, Math.min(85, avg(domainSentiments.economic))),
    diplomatic: Math.max(40, Math.min(90, avg(domainSentiments.diplomatic))),
    tech:       Math.max(30, Math.min(80, avg(domainSentiments.tech))),
    climate:    Math.max(25, Math.min(75, avg(domainSentiments.climate))),
    social:     Math.max(35, Math.min(80, avg(domainSentiments.social))),
  };
  scores.overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
  scores.trend = scores.overall >= 55 ? 'improving' : 'declining';
  // Domain labels for frontend display
  scores.domains = [
    { id: 'military',   label: '🛡️ Military',   score: scores.military,   color: '#e74c3c' },
    { id: 'economic',   label: '💰 Economic',   score: scores.economic,   color: '#f39c12' },
    { id: 'diplomatic', label: '🌏 Diplomatic', score: scores.diplomatic, color: '#3498db' },
    { id: 'tech',       label: '⚡ Technology', score: scores.tech,       color: '#00E5CC' },
    { id: 'climate',    label: '🌿 Climate',    score: scores.climate,    color: '#27ae60' },
    { id: 'social',     label: '🏛️ Political',  score: scores.social,     color: '#9b59b6' },
  ];
  scores.summary = `India's strategic position computed from ${articles.length} live news articles. ${scores.diplomatic >= 60 ? 'Diplomatic' : 'Economic'} domain shows strongest performance at ${Math.max(scores.diplomatic, scores.economic)}/100.`;
  return scores;
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN IMPACT SCORING — pipeline-inspired multi-signal scoring
// ═══════════════════════════════════════════════════════════════
function computeDomainImpact(articles) {
  const results = {};
  for (const [id, cfg] of Object.entries(IMPACT_DOMAINS)) {
    const hits = articles.filter(a => {
      const text = `${a.title} ${a.description || ''}`.toLowerCase();
      return cfg.keywords.some(kw => text.includes(kw));
    });
    const negRels = articles.reduce((acc, a) => {
      return acc + (a.relationships || []).filter(r => cfg.negRelTypes.includes(r.relationship)).length;
    }, 0);
    const artPct = hits.length / Math.max(articles.length, 1);
    const artContrib = Math.min(artPct * 70, 70);
    const relContrib = Math.min(negRels * 10, 30);
    const score = Math.min(Math.round(artContrib + relContrib), 100);
    results[id] = {
      label: cfg.label,
      score,
      color: cfg.color,
      severity: score >= 70 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW',
      articleCount: hits.length,
      topHeadlines: hits.slice(0, 3).map(a => ({ title: a.title, source: a.source, link: a.link })),
      negativeRelCount: negRels,
    };
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════
// CAUSAL CHAINS — multi-hop relationship chains affecting India
// ═══════════════════════════════════════════════════════════════
function detectCausalChains(articles) {
  const INDIA_ENTITIES = ['india', 'indian', 'modi', 'new delhi', 'bharat'];
  // Build adjacency: source → [{ rel, target }]
  const bySource = new Map();
  articles.forEach(a => {
    (a.relationships || []).forEach(r => {
      if (!bySource.has(r.source)) bySource.set(r.source, []);
      bySource.get(r.source).push({ rel: r.relationship, target: r.target, sentiment: a.sentiment });
    });
  });
  const chains = [];
  const seen = new Set();
  for (const [src, rels1] of bySource) {
    for (const r1 of rels1) {
      const mid = r1.target;
      const rels2 = bySource.get(mid) || [];
      for (const r2 of rels2) {
        const isIndiaRelated = (
          INDIA_ENTITIES.some(i => src.toLowerCase().includes(i)) ||
          INDIA_ENTITIES.some(i => r2.target.toLowerCase().includes(i))
        );
        if (!isIndiaRelated) continue;
        const chainStr = `${src} →[${r1.rel}]→ ${mid} →[${r2.rel}]→ ${r2.target}`;
        if (seen.has(chainStr)) continue;
        seen.add(chainStr);
        const danger = (r1.sentiment < 40 ? 1 : 0) + (r2.sentiment < 40 ? 1 : 0);
        chains.push({ chain: chainStr, src, mid, target: r2.target, rel1: r1.rel, rel2: r2.rel, danger });
      }
    }
  }
  return chains.sort((a, b) => b.danger - a.danger).slice(0, 20);
}

// ═══════════════════════════════════════════════════════════════
// WORLD IMPACT MAP — country intensity scores for choropleth
// ═══════════════════════════════════════════════════════════════
function computeWorldImpact(articles) {
  const countryScores = {};
  for (const article of articles) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    const weight = article.sentiment < 40 ? 3 : article.sentiment < 55 ? 1 : 0;
    if (weight === 0) continue;
    for (const [keyword, iso] of Object.entries(COUNTRY_ISO)) {
      if (iso === 'IND') continue;
      if (text.includes(keyword)) {
        countryScores[iso] = (countryScores[iso] || 0) + weight;
      }
    }
  }
  return Object.entries(countryScores)
    .map(([iso, score]) => ({ iso, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}

// ═══════════════════════════════════════════════════════════════
// ENTITY TRENDS — country mention counts by article
// ═══════════════════════════════════════════════════════════════
function computeEntityTrends(articles) {
  const tracked = ['China', 'Pakistan', 'United States', 'Russia', 'Israel', 'Iran', 'UK', 'Japan'];
  const counts = {};
  tracked.forEach(e => { counts[e] = 0; });
  articles.forEach(a => {
    (a.entities || []).forEach(ent => {
      if (counts.hasOwnProperty(ent.name)) counts[ent.name]++;
    });
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// ═══════════════════════════════════════════════════════════════
// RSS PARSER: Fetch + parse one RSS feed
// ═══════════════════════════════════════════════════════════════
async function fetchRSS(feed) {
  try {
    const xml = await fetchUrl(feed.url, 7000);
    const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });

    const channel = result?.rss?.channel || result?.feed;
    if (!channel) return [];

    const items = channel.item || channel.entry || [];
    const itemArray = Array.isArray(items) ? items : [items];

    return itemArray.slice(0, 15).map(item => {
      const title = (typeof item.title === 'string' ? item.title : item.title?._ || item.title?.['#text'] || '').replace(/<[^>]+>/g, '').trim();
      const desc  = (typeof item.description === 'string' ? item.description : item.description?._ || item.summary?._ || item.content?._ || '').replace(/<[^>]+>/g, '').trim();
      const text  = `${title} ${desc}`;
      const pubDate = item.pubDate || item.updated || item.published || new Date().toISOString();

      return {
        title,
        description: desc.slice(0, 300),
        text,
        source: feed.name,
        publishedAt: new Date(pubDate).toISOString(),
        link: typeof item.link === 'string' ? item.link : item.link?.['$']?.href || '',
      };
    }).filter(a => a.title && a.title.length > 5);
  } catch (e) {
    console.warn(`[RSS] ${feed.name} failed: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE: Fetch all feeds + process
// ═══════════════════════════════════════════════════════════════
let CACHE = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function runPipeline() {
  console.log('[GOE] Running intelligence pipeline...');
  const allRaw = [];

  // Fetch all RSS feeds in parallel
  await Promise.allSettled(
    RSS_FEEDS.map(async feed => {
      const articles = await fetchRSS(feed);
      allRaw.push(...articles);
    })
  );

  console.log(`[GOE] Fetched ${allRaw.length} raw articles`);

  // Deduplicate by title similarity
  const seen = new Set();
  const unique = allRaw.filter(a => {
    const key = a.title.slice(0, 60).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Process each article through NLP
  const processed = unique.map(article => {
    const entities  = extractEntities(article.text);
    const sentiment = computeSentiment(article.text);
    const domain    = detectDomain(article.text);
    const threatLevel = computeThreatLevel(article.text, sentiment);
    const relationships = entities.length >= 2 ? inferRelationships(entities, article.text) : [];
    const insight   = article.description || article.title;

    return {
      ...article,
      entities,
      relationships,
      sentiment,
      domain,
      threatLevel,
      insight
    };
  }).filter(a => a.entities.length > 0); // Only articles with recognisable entities

  console.log(`[GOE] Processed ${processed.length} articles with entities`);

  // Build ticker items from recent articles
  const tickerItems = unique
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 20)
    .map(a => ({ text: a.title, domain: detectDomain(a.title + ' ' + a.description), source: a.source, link: a.link }));

  const result = {
    articles: processed,
    threats: detectThreats(processed),
    indiaScore: computeIndiaScore(processed),
    domainImpact: computeDomainImpact(processed),
    causalChains: detectCausalChains(processed),
    worldImpact: computeWorldImpact(processed),
    entityTrends: computeEntityTrends(processed),
    tickerItems,
    sources: RSS_FEEDS.map(f => ({
      name: f.name,
      articleCount: allRaw.filter(a => a.source === f.name).length,
      status: allRaw.some(a => a.source === f.name) ? 'ok' : 'error',
      lastFetch: Date.now()
    })),
    processedAt: new Date().toISOString(),
    totalArticles: unique.length,
    entityArticles: processed.length,
  };

  CACHE = { data: result, timestamp: Date.now() };
  return result;
}

// ═══════════════════════════════════════════════════════════════
// FOREX: Live exchange rates
// ═══════════════════════════════════════════════════════════════
async function fetchForex() {
  try {
    const data = await fetchUrl('https://open.er-api.com/v6/latest/USD', 5000);
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// WORLD BANK GDP
// ═══════════════════════════════════════════════════════════════
async function fetchGDP() {
  try {
    const data = await fetchUrl('https://api.worldbank.org/v2/country/IN/indicator/NY.GDP.MKTP.CD?format=json&per_page=3', 5000);
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/intelligence — full processed intelligence
app.get('/api/intelligence', async (req, res) => {
  try {
    const now = Date.now();
    if (CACHE.data && (now - CACHE.timestamp) < CACHE_TTL) {
      return res.json({ ...CACHE.data, cached: true, cacheAge: Math.round((now - CACHE.timestamp) / 1000) });
    }
    const data = await runPipeline();
    res.json(data);
  } catch (e) {
    console.error('[GOE] Pipeline error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/news?q=china — filtered news search
app.get('/api/news', async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const data = CACHE.data;
  if (!data) return res.json([]);
  const filtered = q
    ? data.articles.filter(a => a.text.toLowerCase().includes(q))
    : data.articles;
  res.json(filtered.slice(0, 50));
});

// GET /api/forex — live exchange rates
app.get('/api/forex', async (req, res) => {
  const data = await fetchForex();
  if (data) res.json(data);
  else res.status(503).json({ error: 'Forex unavailable' });
});

// GET /api/gdp — World Bank GDP
app.get('/api/gdp', async (req, res) => {
  const data = await fetchGDP();
  if (data) res.json(data);
  else res.status(503).json({ error: 'GDP unavailable' });
});

// GET /api/domain-impact — domain-based impact scoring
app.get('/api/domain-impact', (req, res) => {
  if (!CACHE.data) return res.json({});
  res.json(CACHE.data.domainImpact || {});
});

// GET /api/causal-chains — multi-hop causal chains involving India
app.get('/api/causal-chains', (req, res) => {
  if (!CACHE.data) return res.json([]);
  res.json(CACHE.data.causalChains || []);
});

// GET /api/world-impact — country intensity for world map
app.get('/api/world-impact', (req, res) => {
  if (!CACHE.data) return res.json([]);
  res.json(CACHE.data.worldImpact || []);
});

// GET /api/entity-trends — entity mention counts
app.get('/api/entity-trends', (req, res) => {
  if (!CACHE.data) return res.json([]);
  res.json(CACHE.data.entityTrends || []);
});

// GET /api/status — health check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    cached: !!CACHE.data,
    cacheAge: CACHE.timestamp ? Math.round((Date.now() - CACHE.timestamp) / 1000) : null,
    articles: CACHE.data?.totalArticles || 0,
    processedAt: CACHE.data?.processedAt || null
  });
});

// POST /api/claude — AI Gateway Proxy
app.post('/api/claude', (req, res) => {
  const { prompt, maxTokens } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Uses Gemini API directly (Fall back to manually reading .env file if package missing)
  let apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    try {
      const fs = require('fs');
      const path = require('path');
      const envText = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const match = envText.match(/AI_GATEWAY_API_KEY\s*=\s*"?([^"\n]+)"?/);
      if (match) apiKey = match[1].trim();
    } catch (fsErr) {
      console.error('Failed to manually read .env file', fsErr);
    }
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key is completely missing' });
  }

  try {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ],
      generationConfig: { maxOutputTokens: maxTokens || 3000 }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 400) {
          console.error('[Gemini API Error]:', response.statusCode, data);
          return res.status(500).json({ error: `Gemini Error ${response.statusCode}: ${data}` });
        }
        try {
          const parsed = JSON.parse(data);
          let resultText = "";
          
          if (parsed.candidates && parsed.candidates[0].content) {
             resultText = parsed.candidates[0].content.parts[0].text;
          } else {
             // Handle safety block or empty response
             console.error('[Gemini Warning] No content returned. Might be safety filter:', JSON.stringify(parsed));
          }

          console.log('\n[DEBUG] Gemini Raw Output ->\n', resultText, '\n');

          res.json({ content: [{ text: resultText }] });
        } catch (parseErr) {
          res.status(500).json({ error: 'JSON Parse Error: ' + parseErr.message });
        }
      });
    });

    request.on('error', (err) => {
      console.error('[AI Routing Error]:', err.message);
      res.status(500).json({ error: err.message });
    });

    request.write(payload);
    request.end();

  } catch (err) {
    console.error('[AI Routing Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`\n🌐 GOE Intelligence Server running at http://localhost:${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   GET /api/intelligence   — Full pipeline (${RSS_FEEDS.length} feeds, cached 5min)`);
    console.log(`   GET /api/domain-impact  — Military/Economic/Diplomatic/Political scoring`);
    console.log(`   GET /api/causal-chains  — Multi-hop causal chain analysis`);
    console.log(`   GET /api/world-impact   — Country intensity for world map`);
    console.log(`   GET /api/entity-trends  — Entity mention trends`);
    console.log(`   GET /api/news?q=china   — Search articles`);
    console.log(`   GET /api/forex          — Live USD/INR rates`);
    console.log(`   GET /api/gdp            — India GDP (World Bank)`);
    console.log(`   GET /api/status         — Health check\n`);

    // Pre-warm cache on startup
    setTimeout(() => {
      runPipeline().then(d => {
        console.log(`✅ Pipeline ready: ${d.totalArticles} articles, ${d.threats.length} threats detected`);
      }).catch(e => console.error('Pipeline warmup failed:', e.message));
    }, 500);

    // Auto-refresh every 5 minutes
    setInterval(() => {
      runPipeline().catch(e => console.error('Auto-refresh failed:', e.message));
    }, CACHE_TTL);
  });
}

// Export for Vercel Serverless deployments
module.exports = app;
