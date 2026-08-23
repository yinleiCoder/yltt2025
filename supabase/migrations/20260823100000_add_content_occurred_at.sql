alter table public.content_items add column if not exists occurred_at timestamptz;

create index if not exists content_items_story_occurred_idx
  on public.content_items (occurred_at desc nulls last, published_at desc)
  where kind = 'story' and published_at is not null;
