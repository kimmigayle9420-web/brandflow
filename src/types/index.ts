export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  social_accounts: Record<string, string> | null
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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      brands: {
        Row: Brand
        Insert: Omit<Brand, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Brand, 'id' | 'user_id' | 'created_at'>>
      }
      content_pillars: {
        Row: ContentPillar
        Insert: Omit<ContentPillar, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ContentPillar, 'id' | 'user_id' | 'brand_id' | 'created_at'>>
      }
      posts: {
        Row: Post
        Insert: Omit<Post, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Post, 'id' | 'user_id' | 'brand_id' | 'created_at'>>
      }
    }
  }
}
