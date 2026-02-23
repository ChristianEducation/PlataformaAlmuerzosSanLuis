-- Esquema básico: personas, usuarios, entregas
-- Ejecuta en Supabase (Postgres 15+).

-- Tipos
CREATE TYPE rol_usuario AS ENUM ('casino', 'admin');
CREATE TYPE tipo_persona AS ENUM ('funcionario', 'visita', 'reemplazo');

-- Tabla usuarios (pseudo-auth)
CREATE TABLE public.usuarios (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol rol_usuario NOT NULL DEFAULT 'casino',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Tabla personas
CREATE TABLE public.personas (
  id BIGSERIAL PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tipo tipo_persona NOT NULL DEFAULT 'funcionario',
  fecha_inicio DATE,
  fecha_fin DATE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla entregas
CREATE TABLE public.entregas (
  id BIGSERIAL PRIMARY KEY,
  persona_id BIGINT NOT NULL REFERENCES public.personas(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_menu TEXT,
  creado_por_usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT
);

-- Único: una entrega por persona por día
CREATE UNIQUE INDEX entregas_persona_fecha_uniq ON public.entregas (persona_id, fecha);

-- Seeds de ejemplo (comentados). Usa bcrypt costo 10-12. Ejemplo hash de 'changeme':
-- $2b$10$CwTycUXWue0Thq9StjUM0uJ8u1Zg1bFQK1b6s8Kk0QKq6vXWy1ZRm
-- Descomenta para entorno de desarrollo:
-- INSERT INTO public.usuarios (username, password_hash, rol) VALUES
--   ('admin', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8u1Zg1bFQK1b6s8Kk0QKq6vXWy1ZRm', 'admin'),
--   ('casino', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8u1Zg1bFQK1b6s8Kk0QKq6vXWy1ZRm', 'casino');
--
-- INSERT INTO public.personas (nombre_completo, email, tipo, fecha_inicio, fecha_fin) VALUES
--   ('Ana Pérez', 'ana.perez@example.com', 'funcionario', CURRENT_DATE, NULL),
--   ('Luis Gómez', 'luis.gomez@example.com', 'visita', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
--   ('Carla Soto', 'carla.soto@example.com', 'reemplazo', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days');
