-- Applied to the Ningshing Che Supabase project on 2026-11-14.
-- Adds what the website has and the database did not. Additive only: nothing is changed or removed.
begin;

-- 1. Category "পৌ" (in the website menu, no articles yet)
insert into public.categories (title, slug, icon_name)
select 'পৌ', 'পৌ', 'newspaper'
where not exists (select 1 from public.categories where title = 'পৌ');

-- 2. Home-page video that was not in the videos table
insert into public.videos (title, video_link, platform, thumbnail_url)
select 'NingshingChe Webinar with Sujita Sinha (Biva) Episode-1 [Hosts: Surajit Singha Sisir, Moumita Sinha]', 'https://www.youtube.com/watch?v=WE8sPIuBIMs', 'YouTube', 'https://i.ytimg.com/vi/WE8sPIuBIMs/hqdefault.jpg'
where not exists (select 1 from public.videos where video_link like '%WE8sPIuBIMs%');

-- 3. Site settings: new columns for details shown in the website footer and sidebar
alter table public.settings
  add column if not exists site_tagline text not null default '',
  add column if not exists contact_address text not null default '',
  add column if not exists whatsapp_url text not null default '',
  add column if not exists play_store_url text not null default '',
  add column if not exists ad_image_url text not null default '',
  add column if not exists ad_link_url text not null default '';

-- ...and fill the fields that were empty (existing values are kept)
update public.settings set
  logo_url                = coalesce(nullif(logo_url, ''), 'https://surajit-singha-sisir.github.io/NingshingCheNew/NingshingChe-Logo.png'),
  favicon_url             = coalesce(nullif(favicon_url, ''), 'https://surajit-singha-sisir.github.io/NingshingCheNew/NingshingChe-Logo.png'),
  default_seo_title       = coalesce(nullif(default_seo_title, ''), 'নিংশিং চে - বিষ্ণুপ্রিয়া মণিপুরি তথ্যকোষ'),
  default_seo_description = coalesce(nullif(default_seo_description, ''), 'ইমার ঠারে বিষ্ণুপ্রিয়া মণিপুরি সাহিত্য, সংস্কৃতি, ইতিহাস চর্চার অনলাইন প্লাটফর্ম নিংশিং চে'),
  contact_email           = coalesce(nullif(contact_email, ''), 'ningshingche@gmail.com'),
  contact_phone           = coalesce(nullif(contact_phone, ''), '+880 9638-781890'),
  facebook_url            = coalesce(nullif(facebook_url, ''), 'https://www.facebook.com/ningshingche/'),
  youtube_url             = coalesce(nullif(youtube_url, ''), 'https://www.youtube.com/@ningshingche'),
  site_tagline            = coalesce(nullif(site_tagline, ''), 'বিষ্ণুপ্রিয়া মণিপুরি তথ্যকোষ'),
  contact_address         = coalesce(nullif(contact_address, ''), 'তিলকপুর, কমলগঞ্জ, মৌলভীবাজার, সিলেট'),
  whatsapp_url            = coalesce(nullif(whatsapp_url, ''), 'https://whatsapp.com/channel/0029Vab82QgKwqSLmgh9Ma2N'),
  play_store_url          = coalesce(nullif(play_store_url, ''), 'https://play.google.com/store/apps/details?id=com.shakilsoftltd.ningshingche'),
  ad_image_url            = coalesce(nullif(ad_image_url, ''), 'https://i.ibb.co/d0jNCQZx/kehem-it-banner-01.jpg'),
  ad_link_url             = coalesce(nullif(ad_link_url, ''), 'https://kehem.com')
where id = 'site_settings';

commit;
