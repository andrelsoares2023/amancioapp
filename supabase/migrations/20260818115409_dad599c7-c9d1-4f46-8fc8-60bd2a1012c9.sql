CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurso text NOT NULL CHECK (recurso IN ('video','chrome','lab')),
  data date NOT NULL,
  turno text CHECK (turno IN ('matutino','vespertino')),
  aula smallint NOT NULL CHECK (aula BETWEEN 1 AND 5),
  dia_semana text NOT NULL,
  professor text NOT NULL,
  componente text NOT NULL,
  turma text NOT NULL,
  objetivo text NOT NULL DEFAULT '',
  delete_token text NOT NULL,
  origem_local_id text,
  revisar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bookings_slot_unique
  ON public.bookings (recurso, data, turno, aula) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX bookings_origem_local_unique
  ON public.bookings (origem_local_id) WHERE origem_local_id IS NOT NULL;

CREATE INDEX bookings_recurso_data_idx ON public.bookings (recurso, data);

GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;