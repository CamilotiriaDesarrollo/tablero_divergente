-- 0007_marketing_avatar_photos.sql
-- Foto de perfil de cada avatar de Marketing. Las imagenes viven en
-- public/marketing/avatars/<slug>.png (servidas por Next.js, no Supabase
-- Storage), asi que aqui solo se guarda la ruta. Idempotente: se puede correr
-- mas de una vez sin dano.

alter table public.marketing_avatars
  add column if not exists photo_url text;

-- Backfill para los 4 avatares base sembrados en 0006_marketing.sql.
update public.marketing_avatars
  set photo_url = '/marketing/avatars/' || slug || '.png'
  where slug in ('mateo', 'diana', 'juan', 'laura')
    and (photo_url is null or photo_url = '');
