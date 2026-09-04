ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS perfil text NOT NULL DEFAULT 'professor',
  ADD COLUMN IF NOT EXISTS hora_inicio time,
  ADD COLUMN IF NOT EXISTS hora_fim time,
  ALTER COLUMN aula DROP NOT NULL;

DROP INDEX IF EXISTS public.bookings_slot_unique;
CREATE UNIQUE INDEX bookings_slot_unique
  ON public.bookings (recurso, data, turno, aula) NULLS NOT DISTINCT
  WHERE perfil = 'professor';

CREATE OR REPLACE FUNCTION public.bookings_gestao_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.perfil <> 'gestao' THEN
    RETURN NEW;
  END IF;
  IF NEW.hora_inicio IS NULL OR NEW.hora_fim IS NULL OR NEW.hora_fim <= NEW.hora_inicio THEN
    RAISE EXCEPTION 'horario_invalido';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id <> NEW.id
      AND b.perfil = 'gestao'
      AND b.recurso = NEW.recurso
      AND b.data = NEW.data
      AND NEW.hora_inicio < b.hora_fim
      AND b.hora_inicio < NEW.hora_fim
  ) THEN
    RAISE EXCEPTION 'conflito_horario' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_gestao_overlap_trg ON public.bookings;
CREATE TRIGGER bookings_gestao_overlap_trg
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_gestao_overlap();