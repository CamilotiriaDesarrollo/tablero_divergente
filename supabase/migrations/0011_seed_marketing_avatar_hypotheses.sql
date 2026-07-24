-- 0011_seed_marketing_avatar_hypotheses.sql
-- Convierte las hipotesis ya incluidas en la ficha (seccion 06) en el punto
-- de partida del registro de contraste. Soporta tanto ficha-array como el
-- objeto original que contiene la propiedad "sections".

with persona_sections as (
  select
    avatar.id as avatar_id,
    avatar.user_id,
    case jsonb_typeof(avatar.persona_sections)
      when 'array' then avatar.persona_sections
      else coalesce(avatar.persona_sections -> 'sections', '[]'::jsonb)
    end as sections
  from public.marketing_avatars as avatar
), hypothesis_items as (
  select
    persona.avatar_id,
    persona.user_id,
    section.value ->> 'title' as section_title,
    item.value #>> '{}' as title
  from persona_sections as persona
  cross join lateral jsonb_array_elements(persona.sections) as section(value)
  cross join lateral jsonb_array_elements(coalesce(section.value -> 'blocks', '[]'::jsonb)) as block(value)
  cross join lateral jsonb_array_elements(coalesce(block.value -> 'items', '[]'::jsonb)) as item(value)
  where block.value ->> 'label' ilike '%hip%'
)
insert into public.marketing_avatar_observations (
  user_id,
  avatar_id,
  kind,
  title,
  content,
  status
)
select
  hypothesis.user_id,
  hypothesis.avatar_id,
  'hipotesis',
  hypothesis.title,
  concat('Ficha del avatar: ', hypothesis.section_title),
  'por_validar'
from hypothesis_items as hypothesis
where hypothesis.title <> ''
  and not exists (
    select 1
    from public.marketing_avatar_observations as existing
    where existing.avatar_id = hypothesis.avatar_id
      and existing.kind = 'hipotesis'
      and existing.title = hypothesis.title
  );
