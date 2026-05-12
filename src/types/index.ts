// One connected social platform — manually-entered stats (we don't have API access
// to pull real follower counts), structured so the dashboard can render per-platform
// follower/engagement cards.
export type SocialAccount = {
  platform: string       // 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | …
  handle: string         // @username
  followers: number      // 0 if the user hasn't entered a number yet
  engagement: number     // avg engagement % (0 if not entered)
  url?: string           // optional profile URL override
}

// Stored format in profiles.social_accounts. Older rows may still hold a bare
// string (handle only) per platform — normalize via lib/social-accounts.ts.
export type SocialAccountsMap = Record<string, SocialAccount | string>

export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  social_accounts: SocialAccountsMap | null
  // Instagram Graph API connection — populated by /api/auth/instagram/callback.
  instagram_access_token: string | null
  instagram_token_expires_at: string | null
  instagram_user_id: string | null
  instagram_page_id: string | null
  created_at: string
  updated_at: string
}

export type Brand = {
  id: string
  user_id: string
  name: string
  niche: string
  target_audience: string | null
  tone_of_voice: string | null
  primary_color: string
  secondary_color: string
  logo_url: string | null
  website_url: string | null
  created_at: string
  updated_at: string
}

export type ContentPillar = {
  id: string
  brand_id: string
  user_id: string
  name: string
  emoji: string | null
  description: string | null
  color: string
  sort_order: number
  // ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS voice_direction text;
  // ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS format_preference text CHECK (format_preference IN ('post','carousel','reel','any'));
  // ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS weekly_quota integer DEFAULT 2;
  voice_direction: string | null
  format_preference: 'post' | 'carousel' | 'reel' | 'any' | null
  weekly_quota: number | null
  created_at: string
  updated_at: string
}

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type PostPlatform = 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'facebook' | 'youtube' | 'pinterest' | 'other'
export type PostFormat = 'carousel' | 'reel' | 'story' | 'static'

export type Post = {
  id: string
  brand_id: string
  user_id: string
  pillar_id: string | null
  platform: PostPlatform
  format: PostFormat
  caption_draft: string | null
  media_url: string | null
  hashtags: string | null
  scheduled_date: string | null
  status: PostStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type PostWithPillar = Post & {
  content_pillars: Pick<ContentPillar, 'name' | 'color'> | null
}

export type IdeaStatus = 'idea' | 'draft' | 'scheduled' | 'posted'

export type Idea = {
  id: string
  user_id: string
  brand_id: string
  pillar_id: string | null
  format: 'post' | 'carousel' | 'reel'
  title: string
  hook: string | null
  caption: string | null
  hashtags: string | null
  slides: Record<string, unknown>[] | null
  script: Record<string, unknown> | null
  media_url: string | null
  status: IdeaStatus
  scheduled_date: string | null
  scheduled_at: string | null
  platform: PostPlatform | null
  created_at: string
  updated_at: string
}

// Splits a Row into required (non-nullable) keys and optional (nullable) keys,
// matching Postgres semantics where nullable columns don't need to be supplied
// at INSERT time. Mirrors the shape supabase-cli generates from `supabase gen types`.
type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never
}[keyof T]
type RequiredKeys<T> = Exclude<keyof T, NullableKeys<T>>

type InsertOf<Row, OmitKeys extends keyof Row> =
  & { [K in Exclude<RequiredKeys<Row>, OmitKeys>]: Row[K] }
  & { [K in Exclude<NullableKeys<Row>, OmitKeys>]?: Row[K] }

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: InsertOf<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      brands: {
        Row: Brand
        Insert: InsertOf<Brand, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Brand, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      content_pillars: {
        Row: ContentPillar
        Insert: InsertOf<ContentPillar, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ContentPillar, 'id' | 'user_id' | 'brand_id' | 'created_at'>>
        Relationships: []
      }
      posts: {
        Row: Post
        Insert: InsertOf<Post, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Post, 'id' | 'user_id' | 'brand_id' | 'created_at'>>
        Relationships: []
      }
      ideas: {
        Row: Idea
        Insert: InsertOf<Idea, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Idea, 'id' | 'user_id' | 'brand_id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
