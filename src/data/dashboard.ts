// Static dashboard data per platform.
// Real follower/engagement is overlaid from profiles.social_accounts when available.

export type PlatformId = "instagram" | "tiktok" | "shorts"

export type Stat = {
  label: string
  value: string
  delta?: string
  deltaPct?: string
  highlight?: boolean
  sparkline?: number[]
  goal?: { current: number; max: number; label: string }
}

export type RecentPost = {
  format: string
  emoji: string
  title: string
  date: string
  primary: string
  primaryLabel: string
  likes: string
  comments: string
}

export type Pillar = {
  name: string
  pct: number
  swatch: "orange" | "brown" | "ink" | "brownSoft"
}

export type AudienceRow = { l: string; v: number }

export type WeekDay = { d: string; date: number; posted: boolean; today?: boolean }

export type ChangelogEntry = {
  date: string
  headline: string
  signal: string
}

export type Platform = {
  id: PlatformId
  name: string
  shortName: string
  accent: string
  handleHint: string
  stats: Stat[]
  posts: RecentPost[]
  thisWeek: {
    range: string
    rows: { label: string; value: string }[]
    days: WeekDay[]
  }
  audience: {
    title: string
    demographics: AudienceRow[]
    countries: AudienceRow[]
  }
  algorithmWatch: {
    lastScan: string
    nextScan: string
    entries: ChangelogEntry[]
    prediction: string
  }
}

// Plausible upward-trending sparkline series
const SPARK_FOLLOWERS = [42100, 42600, 43200, 43900, 44500, 45100, 45800, 46300, 46900, 47200]
const SPARK_SUBS      = [78400, 80100, 82500, 84200, 86100, 87800, 89400, 90600, 91500, 92400]

export const PROFILE = {
  firstName: "Maya",
  fullName: "Maya Okafor",
  handle: "maya.makes",
  bio: "Photographer & writer documenting slow living in Lisbon. Brand on the move.",
  pillars: [
    { name: "Process & craft", pct: 38, swatch: "orange" },
    { name: "Personal",        pct: 25, swatch: "brown" },
    { name: "Highlights",      pct: 22, swatch: "ink" },
    { name: "Offers",          pct: 15, swatch: "brownSoft" },
  ] as Pillar[],
}

export const PLATFORMS: Record<PlatformId, Platform> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    shortName: "Instagram",
    accent: "#E06A33",
    handleHint: "@maya.makes",
    stats: [
      {
        label: "Followers",
        value: "47.2K",
        delta: "+145",
        deltaPct: "+0.3%",
        sparkline: SPARK_FOLLOWERS,
      },
      { label: "Engagement",   value: "4.8%",    delta: "+0.3pt" },
      { label: "Reach (28d)",  value: "612K",    deltaPct: "+18%" },
      {
        label: "Follow rate",
        value: "0.045%",
        highlight: true,
        goal: { current: 45, max: 60, label: "target 0.06%" },
      },
    ],
    posts: [
      { format: "Carousel", emoji: "🌅", title: "Quiet morning, Alfama",             date: "Mon · 12 May", primary: "84.2K", primaryLabel: "reach",   likes: "5,820", comments: "312" },
      { format: "Reel",     emoji: "🎒", title: "How I pack one bag for a month",    date: "Sat · 10 May", primary: "126K",  primaryLabel: "reach",   likes: "7,140", comments: "891" },
      { format: "Post",     emoji: "🚋", title: "Tram 28, golden hour",              date: "Thu · 08 May", primary: "38.4K", primaryLabel: "reach",   likes: "2,930", comments: "104" },
      { format: "Carousel", emoji: "✏️", title: "Workflow: editing on the road",     date: "Tue · 06 May", primary: "52.6K", primaryLabel: "reach",   likes: "3,840", comments: "198" },
    ],
    thisWeek: {
      range: "Mon 12 → Sun 18",
      rows: [
        { label: "Posts published", value: "3" },
        { label: "Top format",      value: "Reel" },
        { label: "Top reach",       value: "126K" },
      ],
      days: [
        { d: "M", date: 12, posted: true, today: true },
        { d: "T", date: 13, posted: false },
        { d: "W", date: 14, posted: true },
        { d: "T", date: 15, posted: false },
        { d: "F", date: 16, posted: true },
        { d: "S", date: 17, posted: false },
        { d: "S", date: 18, posted: false },
      ],
    },
    audience: {
      title: "Audience on Instagram",
      demographics: [
        { l: "Women 25–34", v: 42 },
        { l: "Women 18–24", v: 24 },
        { l: "Men 25–34",   v: 18 },
        { l: "Other",       v: 16 },
      ],
      countries: [
        { l: "Portugal", v: 34 },
        { l: "US",       v: 21 },
        { l: "UK",       v: 14 },
        { l: "Brazil",   v: 9  },
        { l: "Spain",    v: 7  },
      ],
    },
    algorithmWatch: {
      lastScan: "Mon 12 May · 04:12",
      nextScan: "Tue 13 May · 04:00",
      entries: [
        {
          date: "10 May",
          headline: "Carousels with first-slide hooks getting +22% reach uplift",
          signal: "Cover slide weight rebalanced toward thumbnail click-throughs.",
        },
        {
          date: "06 May",
          headline: "Reels under 14s seeing a meaningful follow-rate bump",
          signal: "Completion-weighted ranking favours shorter loops this fortnight.",
        },
      ],
      prediction: "Expect 7–14s Reels and carousel covers to drive your next 10K follows. Carousels stay safest for reach.",
    },
  },

  tiktok: {
    id: "tiktok",
    name: "TikTok",
    shortName: "TikTok",
    accent: "#FF2B5E",
    handleHint: "@maya.makes",
    stats: [
      { label: "Followers",      value: "184K",    delta: "+12.8K", deltaPct: "+7.5%" },
      { label: "Views (28d)",    value: "12.6M",   deltaPct: "+34%" },
      { label: "Avg watch",      value: "11.2s",   delta: "+0.9s" },
      {
        label: "Profile visits",
        value: "48,210",
        deltaPct: "+19%",
        highlight: true,
        goal: { current: 48, max: 60, label: "target 60K / mo" },
      },
    ],
    posts: [
      { format: "Voiceover", emoji: "🎙️", title: "Why I shoot on a 35mm",          date: "Sun · 11 May", primary: "3.4M", primaryLabel: "views", likes: "284K", comments: "6,820" },
      { format: "Trend",     emoji: "⚡",  title: "Lisbon in 30 seconds",            date: "Fri · 09 May", primary: "1.8M", primaryLabel: "views", likes: "142K", comments: "3,210" },
      { format: "Storytime", emoji: "📖", title: "The shot I almost deleted",       date: "Wed · 07 May", primary: "890K", primaryLabel: "views", likes: "74K",  comments: "2,140" },
      { format: "Trend",     emoji: "🌇", title: "POV: golden hour, every day",     date: "Mon · 05 May", primary: "1.2M", primaryLabel: "views", likes: "96K",  comments: "1,860" },
    ],
    thisWeek: {
      range: "Mon 12 → Sun 18",
      rows: [
        { label: "Posts published", value: "5" },
        { label: "Top format",      value: "Voiceover" },
        { label: "Top views",       value: "3.4M" },
      ],
      days: [
        { d: "M", date: 12, posted: true, today: true },
        { d: "T", date: 13, posted: false },
        { d: "W", date: 14, posted: true },
        { d: "T", date: 15, posted: true },
        { d: "F", date: 16, posted: false },
        { d: "S", date: 17, posted: true },
        { d: "S", date: 18, posted: true },
      ],
    },
    audience: {
      title: "Audience on TikTok",
      demographics: [
        { l: "Women 18–24", v: 38 },
        { l: "Women 25–34", v: 28 },
        { l: "Men 18–24",   v: 19 },
        { l: "Other",       v: 15 },
      ],
      countries: [
        { l: "US",       v: 29 },
        { l: "UK",       v: 17 },
        { l: "Portugal", v: 14 },
        { l: "Brazil",   v: 11 },
        { l: "Germany",  v: 8  },
      ],
    },
    algorithmWatch: {
      lastScan: "Mon 12 May · 04:12",
      nextScan: "Tue 13 May · 04:00",
      entries: [
        {
          date: "11 May",
          headline: "Voiceover-led storytime hitting +40% completion vs trend audio",
          signal: "Originality weighting bumped after the audio-credit update.",
        },
        {
          date: "04 May",
          headline: "Profile-visit conversion stronger from 8–12s hooks",
          signal: "Hook density rewarded over jump-cut volume this cycle.",
        },
      ],
      prediction: "Lean into voiceover storytimes — 12–22s, single-shot, name the place. Expect another +20% on profile visits.",
    },
  },

  shorts: {
    id: "shorts",
    name: "YouTube Shorts",
    shortName: "Shorts",
    accent: "#FF0033",
    handleHint: "@maya.makes",
    stats: [
      {
        label: "Subscribers",
        value: "92.4K",
        delta: "+3.2K",
        deltaPct: "+3.6%",
        sparkline: SPARK_SUBS,
      },
      { label: "Views (28d)",   value: "6.2M",   deltaPct: "+21%" },
      { label: "Watch time",    value: "184K hr", deltaPct: "+14%" },
      {
        label: "Completion",
        value: "41%",
        delta: "+2.4pt",
        highlight: true,
        goal: { current: 41, max: 55, label: "target 55%" },
      },
    ],
    posts: [
      { format: "Short",    emoji: "☕", title: "My quiet cafe workflow",        date: "Sun · 11 May", primary: "510K", primaryLabel: "views", likes: "35K", comments: "1,020" },
      { format: "Tutorial", emoji: "💡", title: "Reading light on tile floors",  date: "Thu · 08 May", primary: "612K", primaryLabel: "views", likes: "24K", comments: "980"   },
      { format: "Short",    emoji: "🖼️", title: "One photo, three crops",        date: "Mon · 05 May", primary: "428K", primaryLabel: "views", likes: "18K", comments: "640"   },
    ],
    thisWeek: {
      range: "Mon 12 → Sun 18",
      rows: [
        { label: "Posts published", value: "2" },
        { label: "Top format",      value: "Short" },
        { label: "Top views",       value: "612K" },
      ],
      days: [
        { d: "M", date: 12, posted: true, today: true },
        { d: "T", date: 13, posted: false },
        { d: "W", date: 14, posted: false },
        { d: "T", date: 15, posted: true },
        { d: "F", date: 16, posted: false },
        { d: "S", date: 17, posted: false },
        { d: "S", date: 18, posted: false },
      ],
    },
    audience: {
      title: "Audience on Shorts",
      demographics: [
        { l: "Men 18–24",   v: 32 },
        { l: "Men 25–34",   v: 26 },
        { l: "Women 18–24", v: 21 },
        { l: "Other",       v: 21 },
      ],
      countries: [
        { l: "US",       v: 38 },
        { l: "UK",       v: 13 },
        { l: "India",    v: 11 },
        { l: "Canada",   v: 8  },
        { l: "Australia",v: 6  },
      ],
    },
    algorithmWatch: {
      lastScan: "Mon 12 May · 04:12",
      nextScan: "Tue 13 May · 04:00",
      entries: [
        {
          date: "09 May",
          headline: "Shorts with text-on-screen seeing +15% completion",
          signal: "Hold-time on first 2 seconds reweighted after the May refresh.",
        },
        {
          date: "03 May",
          headline: "Tutorials > pure aesthetic Shorts for subs this month",
          signal: "Subscribe-rate boosted on demos with a clear payoff frame.",
        },
      ],
      prediction: "Front-load text hooks and aim for a payoff frame at 0:08. Completion likely to clear 45% this cycle.",
    },
  },
}
