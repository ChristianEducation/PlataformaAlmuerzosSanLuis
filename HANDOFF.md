# Documento de Transferencia Tecnica — Plataforma Almuerzos San Luis

**Fecha de generacion:** 2026-02-27
**Preparado por:** Auditoria tecnica automatizada del repositorio
**Destinatario:** Informatico / Administrador TI del Colegio San Luis

---

## 1) Resumen Ejecutivo

La **Plataforma Almuerzos San Luis** es una aplicacion web interna del Colegio San Luis que gestiona la entrega diaria de almuerzos a funcionarios, visitas y reemplazos. Permite registrar cada entrega en tiempo real, controlar que solo se entregue un almuerzo por persona por dia, y generar metricas y reportes mensuales con proyecciones de costo.

**Componentes principales:**
- **Frontend:** Interfaz web con React (Server Components + Client Components)
- **Backend/API:** Rutas API REST integradas en el mismo servidor (Next.js App Router)
- **Base de datos:** PostgreSQL gestionada a traves de Supabase
- **Correo transaccional:** Resend (notificaciones de entrega)
- **Autenticacion:** Sistema propio basado en cookies firmadas (HMAC-SHA256) con bcrypt para hashing de contrasenas

No utiliza autenticacion de Supabase (Supabase Auth); la autenticacion es 100% personalizada.

---

## 2) Stack y Arquitectura

### Lenguajes, Framework, Runtime

| Componente | Tecnologia | Version |
|---|---|---|
| Lenguaje | TypeScript | 5.x |
| Framework | Next.js (App Router) | 16.1.1 |
| UI Library | React | 19.2.3 |
| Estilos | Tailwind CSS + shadcn/ui (Radix UI) | 3.4.14 |
| Runtime | Node.js | 20+ |
| Base de datos | PostgreSQL via Supabase | 15+ |
| Email | Resend | 6.7.0 |
| Hashing | bcryptjs | 3.0.3 |
| Reportes | xlsx / xlsx-js-style | 0.18.5 |

### Estructura del Proyecto (carpetas y responsabilidades)

| Carpeta | Responsabilidad |
|---|---|
| `app/` | Paginas y rutas API (Next.js App Router) |
| `app/login/` | Pantalla de inicio de sesion |
| `app/fila/` | Interfaz operativa del casino: lista de personas, registro de entregas |
| `app/admin/` | Panel completo de administracion (superadmin) |
| `app/admin/personas/` | CRUD de personas (funcionarios, visitas, reemplazos) |
| `app/admin/usuarios/` | CRUD de usuarios del sistema |
| `app/admin/entregas/` | Historial de entregas con exportacion a Excel |
| `app/admin/metricas/` | Dashboard de metricas con graficos y calendario |
| `app/admin/configuracion/` | Horarios, precio almuerzo, email de reportes |
| `app/admin-metricas/` | Vista simplificada de metricas (para rol admin) |
| `app/api/` | Endpoints REST del backend |
| `components/ui/` | Componentes reutilizables de UI (shadcn/ui) |
| `components/admin/` | Shell y sidebar del panel admin |
| `lib/auth/` | Logica de sesiones (creacion, verificacion de cookies) |
| `lib/supabase/` | Clientes de Supabase (servidor y navegador) |
| `supabase/` | Schema SQL de la base de datos |
| `public/` | Imagenes estaticas (logos del colegio) |

### Flujo de Datos

```
Usuario (navegador)
    |
    v
Pagina Next.js (Server Component)
    |-- Valida sesion (cookie HMAC-SHA256)
    |-- Consulta BD via Supabase Server Client (service role key)
    |-- Renderiza HTML en servidor
    v
Cliente (interaccion)
    |
    v
fetch() a /api/* (API Routes)
    |-- Valida sesion
    |-- Valida rol (casino / admin / superadmin)
    |-- Operacion en BD (Supabase)
    |-- [Opcional] Envio de email (Resend)
    v
Respuesta JSON al cliente
```

### Autenticacion y Roles

**Mecanismo:** Cookies firmadas con HMAC-SHA256 (sin JWT externo, sin Supabase Auth).

- El usuario ingresa usuario/contrasena en `/login`
- El backend compara con `bcrypt.compare()` contra el hash almacenado en la tabla `usuarios`
- Si es valido, genera una cookie `session` firmada con `SESSION_SECRET`, con TTL de 12 horas
- La cookie es `httpOnly`, `sameSite: lax`, y `secure` en produccion

**Roles definidos:**

| Rol | Acceso |
|---|---|
| `casino` | Solo puede acceder a `/fila` (registrar entregas) |
| `admin` | Accede a `/admin-metricas` (vista simplificada de metricas) |
| `superadmin` | Acceso completo: `/admin` (personas, usuarios, entregas, metricas, configuracion) |

**Nota:** En el schema SQL original el tipo `rol_usuario` solo incluye `'casino'` y `'admin'`. El rol `superadmin` se maneja a nivel de aplicacion (el codigo valida `superadmin` como un valor valido) pero deberia agregarse al ENUM en BD o manejarse como dato de texto.

**Redirecciones post-login:**
- `superadmin` → `/admin`
- `admin` → `/admin-metricas`
- `casino` → `/fila`

---

## 3) Configuracion y Variables de Entorno

### Lista Completa

| Variable | Proposito | Obligatoria | Lado |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Si | Cliente + Servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anonima/publica de Supabase | Si | Cliente + Servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase (acceso total a BD) | Si | Solo servidor |
| `SESSION_SECRET` | Secreto para firmar cookies de sesion (HMAC-SHA256) | Si | Solo servidor |
| `RESEND_API_KEY` | API key del servicio Resend para envio de emails | Si (para emails) | Solo servidor |
| `EMAIL_FROM` | Direccion del remitente en emails transaccionales | Si (para emails) | Solo servidor |
| `ADMIN_EMAIL` | Email del administrador (fallback para notificaciones) | Si (para emails) | Solo servidor |
| `NODE_ENV` | Modo del entorno (`development` / `production`) | Automatica | Servidor |

### Que Cambia entre Ambientes

| Variable | Desarrollo | Produccion |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase de dev | URL del proyecto Supabase de prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon del proyecto dev | Clave anon del proyecto prod |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key dev | Service role key prod |
| `SESSION_SECRET` | Cualquier string largo | String largo, criptograficamente seguro, unico |
| `RESEND_API_KEY` | Clave de pruebas de Resend | Clave de produccion de Resend |
| `EMAIL_FROM` | `onboarding@resend.dev` (sandbox) | Email verificado con dominio propio |
| `ADMIN_EMAIL` | Email personal de pruebas | Email institucional del administrador |

---

## 4) Base de Datos

### Motor y Version

- **Motor:** PostgreSQL 15+
- **Proveedor actual:** Supabase (PostgreSQL como servicio)
- **Schema ubicacion:** `supabase/schema.sql`

### Tablas Principales y Relaciones

**Tabla `usuarios`** — Cuentas de acceso al sistema
- `id` (BIGSERIAL, PK)
- `username` (TEXT, UNIQUE) — Nombre de usuario
- `password_hash` (TEXT) — Hash bcrypt de la contrasena
- `rol` (ENUM: casino, admin) — Rol del usuario
- `activo` (BOOLEAN) — Si puede iniciar sesion
- `created_at` (TIMESTAMPTZ) — Fecha de creacion
- `last_login_at` (TIMESTAMPTZ) — Ultimo inicio de sesion

**Tabla `personas`** — Beneficiarios de almuerzo
- `id` (BIGSERIAL, PK)
- `nombre_completo` (TEXT)
- `email` (TEXT, UNIQUE)
- `tipo` (ENUM: funcionario, visita, reemplazo)
- `fecha_inicio` (DATE) — Inicio de vigencia
- `fecha_fin` (DATE) — Fin de vigencia (null = indefinido)
- `activo` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

**Tabla `entregas`** — Registros de entrega de almuerzo
- `id` (BIGSERIAL, PK)
- `persona_id` (BIGINT, FK → personas.id, ON DELETE RESTRICT)
- `fecha` (DATE) — Dia de la entrega
- `created_at` (TIMESTAMPTZ) — Timestamp exacto
- `tipo_menu` (TEXT, nullable)
- `creado_por_usuario_id` (BIGINT, FK → usuarios.id, ON DELETE RESTRICT)
- **Restriccion UNIQUE:** (persona_id, fecha) — Una entrega por persona por dia

**Tabla `configuracion`** — Ajustes globales del sistema (fila unica, id=1)
- `hora_inicio` (TEXT, formato HH:MM)
- `hora_cierre` (TEXT, formato HH:MM)
- `mensaje_cierre` (TEXT) — Mensaje cuando se intenta registrar fuera de horario
- `reporte_email` (TEXT) — Email para reportes
- `precio_almuerzo` (NUMERIC) — Precio unitario del almuerzo

**Nota:** La tabla `configuracion` no esta en el archivo `schema.sql`. Se asume que fue creada manualmente en Supabase. Debe agregarse al schema para tener el DDL completo.

### Relaciones

```
usuarios (1) ──< entregas (N)     [creado_por_usuario_id]
personas (1) ──< entregas (N)     [persona_id]
configuracion: tabla singleton (id=1), sin relaciones
```

### Como Inicializar el Schema desde Cero

1. Crear un proyecto en Supabase (o instalar PostgreSQL 15+ local)
2. Ejecutar el contenido de `supabase/schema.sql` en el SQL Editor de Supabase
3. Crear manualmente la tabla `configuracion` (no esta en el schema):
   - Campos: `id` (INT PK), `hora_inicio` (TEXT), `hora_cierre` (TEXT), `mensaje_cierre` (TEXT), `reporte_email` (TEXT), `precio_almuerzo` (NUMERIC)
   - Insertar fila inicial con `id = 1`
4. Si el rol `superadmin` se necesita en BD (no solo en app), ejecutar: `ALTER TYPE rol_usuario ADD VALUE 'superadmin';`
5. Crear el usuario administrador inicial con un hash bcrypt (costo 10) de la contrasena deseada
6. Los seeds de ejemplo estan comentados en el schema.sql (contrasena: `changeme`)

### Migrar/Portar la BD a Otro Proveedor

**De Supabase a PostgreSQL propio (VPS, cloud, etc.):**
- Exportar con `pg_dump` desde Supabase
- Importar con `psql` en el nuevo servidor
- Cambiar solo las variables de entorno: `NEXT_PUBLIC_SUPABASE_URL` y claves
- **Importante:** El codigo usa la libreria `@supabase/supabase-js` como cliente. Si se migra a un PostgreSQL sin la capa REST de Supabase, seria necesario reemplazar el cliente por un ORM (Prisma, Drizzle) o un driver directo (pg). Esto implica reescribir la capa de acceso a datos.

**De Supabase Cloud a Supabase Self-hosted:**
- La migracion es transparente; solo cambiar las variables de entorno (URL y claves)
- No requiere cambios en codigo

### Riesgos Comunes

- **RLS (Row Level Security):** No se encontraron politicas RLS en el schema. El servidor usa la `service_role_key` que bypasea RLS. Si se habilita RLS, habria que crear politicas o las consultas fallarian.
- **ENUM `rol_usuario`:** Solo contiene `'casino'` y `'admin'`. El rol `superadmin` se maneja en codigo pero no existe en el tipo ENUM de la BD. Podria causar errores al insertar usuarios superadmin si la columna tiene constraint de tipo ENUM.
- **ON DELETE RESTRICT:** No se puede eliminar una persona que tenga entregas registradas. Esto es intencional (preserva integridad), pero el informante debe saberlo.
- **Tabla `configuracion`:** No documentada en `schema.sql`. Riesgo de perderla en una recreacion desde cero.

---

## 5) Despliegue (Dominio y Hosting)

### Opciones Recomendadas

| Opcion | Pros | Contras |
|---|---|---|
| **Vercel** (recomendada) | Zero-config para Next.js, SSL automatico, CDN global, deploy automatico desde Git | Tier gratuito tiene limites; funciones serverless con cold starts |
| **Servidor Node.js** (VPS) | Control total, sin limites de uso, costo fijo | Requiere mantener servidor, configurar SSL, proceso de deploy manual |
| **Docker + VPS** | Reproducible, portable | Requiere Dockerfile (no existe aun), mas complejidad operativa |

### Pasos de Build y Despliegue (Vercel)

1. Conectar el repositorio de GitHub al proyecto en Vercel
2. Configurar todas las variables de entorno en el dashboard de Vercel (seccion "Environment Variables")
3. Vercel detecta automaticamente Next.js y ejecuta `npm run build`
4. Cada push a la rama principal despliega automaticamente
5. Verificar que la aplicacion carga correctamente en la URL asignada

### Pasos de Build y Despliegue (Servidor Propio)

1. Clonar el repositorio en el servidor
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno en archivo `.env` o en el entorno del sistema
4. Compilar: `npm run build`
5. Iniciar: `npm start` (escucha en puerto 3000 por defecto)
6. Configurar un reverse proxy (Nginx/Caddy) con SSL para exponer el puerto

### Configuracion de Dominio

- **DNS:** Crear un registro A (IP del servidor) o CNAME (si usa Vercel/servicio con subdominio)
- **Subdominio recomendado:** `almuerzos.colegiosanluis.cl` (o similar)
- **SSL:** Automatico en Vercel. En servidor propio, usar Let's Encrypt via Certbot o Caddy
- **No se encontro** configuracion de dominio personalizado en el repositorio

### Responsabilidades

| Responsable | Tarea |
|---|---|
| **Informatico/Cliente** | Configurar DNS, renovar dominio, gestionar accesos a Vercel/hosting, monitorear uptime |
| **Desarrollador** | Configurar el proyecto en Vercel inicialmente, entregar variables de entorno, documentar proceso |

---

## 6) Correos Transaccionales (Resend)

### Servicio y Uso

- **Proveedor:** Resend (resend.com)
- **Libreria:** `resend` v6.7.0
- **Ubicacion del codigo:** `app/api/entregas/route.ts`

### Tipos de Correo Enviados

| Correo | Trigger | Destinatario |
|---|---|---|
| Confirmacion de entrega de almuerzo | Al registrar una entrega (`POST /api/entregas`) | Email de la persona (o fallback al admin) |

**Estado actual:** Los correos se envian **solo al `ADMIN_EMAIL`** como fallback. Hay un flag hardcodeado (`isFallback = true`) que fuerza este comportamiento mientras se verifica el dominio del remitente.

### Requisitos para Modo Produccion

1. **Verificar dominio en Resend:** Entrar al dashboard de Resend → Domains → Agregar el dominio del colegio
2. **Configurar registros DNS:**
   - SPF: `v=spf1 include:_spf.resend.com ~all`
   - DKIM: Registros proporcionados por Resend
   - DMARC: `v=DMARC1; p=none;` (minimo recomendado)
3. **Cambiar `EMAIL_FROM`** a una direccion del dominio verificado (ej: `almuerzos@colegiosanluis.cl`)
4. **Cambiar `isFallback` a `false`** en `app/api/entregas/route.ts` (linea 175) para que los correos lleguen directamente a las personas
5. **Actualizar `RESEND_API_KEY`** a la clave de produccion

### Variables que Controlan el Envio

| Variable | Controla |
|---|---|
| `RESEND_API_KEY` | Autenticacion con el servicio Resend |
| `EMAIL_FROM` | Direccion del remitente (debe estar verificada) |
| `ADMIN_EMAIL` | Destinatario fallback (recibe todas las notificaciones mientras `isFallback = true`) |

### Como Probar y Revisar Logs

- **Probar envio:** Registrar una entrega en `/fila` y verificar que llega al `ADMIN_EMAIL`
- **Logs de Resend:** Dashboard de Resend → Emails → Ver estado de cada envio (entregado, rebotado, etc.)
- **Logs del servidor:** Errores de envio se imprimen en consola (`console.error("Email send error", ...)`)
- **Errores posibles:** `missing_config` (faltan variables), `no_destination` (sin email destino), `send_error` (fallo de API)

---

## 7) Seguridad y Operacion

### Donde se Guardan los Secretos

- **En produccion:** Variables de entorno del proveedor de hosting (dashboard de Vercel, `.env` en servidor)
- **En desarrollo:** Archivo `.env.local` (excluido de Git via `.gitignore`)
- **Donde NO deben estar:** En el codigo fuente, en el repositorio, en archivos trackeados por Git

### Secretos Criticos a Proteger

| Secreto | Impacto si se filtra |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Acceso total a la base de datos (lectura, escritura, eliminacion sin restricciones) |
| `SESSION_SECRET` | Permite falsificar cookies de sesion y suplantar cualquier usuario |
| `RESEND_API_KEY` | Permite enviar emails desde el dominio del colegio |

### Recomendaciones de Rotacion de Claves

- **`SESSION_SECRET`:** Rotar cada 6 meses o ante sospecha de compromiso. Al rotar, todas las sesiones activas se invalidan automaticamente (los usuarios deben re-loguearse).
- **`SUPABASE_SERVICE_ROLE_KEY`:** Solo se puede rotar regenerando el proyecto Supabase o desde Settings → API. Requiere actualizar la variable en produccion inmediatamente.
- **`RESEND_API_KEY`:** Rotar desde el dashboard de Resend. Generar nueva clave, actualizar variable, luego eliminar la anterior.
- **Contrasenas de usuarios:** No hay politica de expiracion implementada. Se recomienda cambiar periodicamente las contrasenas de cuentas admin/superadmin.

### Logs y Monitoreo

| Que existe | Que falta |
|---|---|
| Errores de BD en consola del servidor (`console.error`) | Sistema centralizado de logs (ej: Datadog, LogTail, Vercel Logs) |
| Errores de email en consola del servidor | Alertas automaticas ante fallos |
| `last_login_at` en tabla usuarios | Registro de auditorias (quien hizo que y cuando) |
| No encontrado: logging estructurado | Dashboard de monitoreo de salud del sistema |

### Backups

- **BD (Supabase):** Supabase incluye backups automaticos diarios en el plan Pro. En el plan gratuito, los backups son limitados.
- **Recomendacion minima:**
  - Programar un `pg_dump` semanal (o diario) y almacenar en un bucket de almacenamiento externo (S3, Google Cloud Storage)
  - Exportar la tabla `entregas` mensualmente a Excel como respaldo adicional (la funcionalidad ya existe en el sistema)
  - Mantener una copia del `schema.sql` actualizado fuera del repositorio
- **Archivos:** No hay almacenamiento de archivos en el sistema. Solo imagenes estaticas en `public/` que viven en el repositorio.

---

## 8) Checklist Final para Entrega "100%"

### Accesos que Debe Tener el Cliente

- [ ] Acceso al repositorio de codigo (GitHub: lectura minima, idealmente admin)
- [ ] Acceso al proyecto de Supabase (owner o admin)
- [ ] Acceso al dashboard de Vercel (o hosting utilizado)
- [ ] Acceso al panel de DNS del dominio
- [ ] Acceso a la cuenta de Resend
- [ ] Credenciales del usuario `superadmin` inicial del sistema

### Que Debe Entregar el Desarrollador

- [ ] Repositorio limpio y funcional en GitHub
- [ ] Este documento de transferencia (`HANDOFF.md`)
- [ ] Schema SQL completo (incluir tabla `configuracion`)
- [ ] Variables de entorno de produccion documentadas (nombres y propositos, NO valores)
- [ ] Cuenta superadmin inicial creada en la BD de produccion
- [ ] Dominio verificado en Resend (o instrucciones claras para hacerlo)
- [ ] Instrucciones para desactivar el fallback de email (`isFallback`)

### Que Debe Ejecutar/Configurar el Informatico

- [ ] Configurar DNS del dominio apuntando al hosting (A o CNAME)
- [ ] Verificar que SSL esta activo (automatico en Vercel)
- [ ] Agregar registros DNS para Resend (SPF, DKIM, DMARC)
- [ ] Verificar que los correos de prueba llegan correctamente
- [ ] Crear cuentas de usuario adicionales desde el panel admin
- [ ] Cargar el listado de personas (funcionarios, visitas, reemplazos)
- [ ] Configurar horario de atencion y precio de almuerzo en `/admin/configuracion`
- [ ] Establecer politica de backups de BD
- [ ] Probar el flujo completo: login → registrar entrega → verificar email → ver metricas → exportar Excel

---

## 9) Pendientes / Asunciones

### Pendientes Detectados

| Item | Estado | Detalle |
|---|---|---|
| Tabla `configuracion` no esta en `schema.sql` | **Pendiente** | Debe agregarse al DDL para que el schema sea auto-contenido |
| ENUM `rol_usuario` no incluye `superadmin` | **Pendiente** | El codigo maneja el rol `superadmin`, pero el tipo ENUM en BD solo tiene `casino` y `admin`. Puede causar error al insertar |
| Verificacion de dominio en Resend | **Pendiente** | Flag `isFallback = true` hardcodeado. Los correos solo llegan al admin |
| No hay middleware de proteccion de rutas | **Asumido** | La proteccion se hace en cada page/API individualmente, no hay un middleware centralizado en `middleware.ts` |
| No hay tests automatizados | **No encontrado** | No se encontraron archivos de test (ni Jest, ni Vitest, ni Cypress) |
| No hay CI/CD | **No encontrado** | No hay archivos en `.github/workflows/` ni `vercel.json` personalizado |
| No hay rate limiting en endpoints | **No encontrado** | Los endpoints de login y entregas no tienen proteccion contra fuerza bruta |
| No hay logging estructurado | **No encontrado** | Solo `console.error` / `console.warn` basicos |
| No hay politica de expiracion de contrasenas | **No encontrado** | Las contrasenas no expiran automaticamente |
| Cliente Supabase browser (`client.ts`) declarado pero no utilizado | **Asumido** | Se encontro `createSupabaseBrowserClient()` pero no se detecto uso en el codigo. Todas las consultas van por el servidor |

### Asunciones

- Se asume que Supabase esta en el plan Pro o superior para backups automaticos. Si esta en plan gratuito, los backups deben configurarse manualmente.
- Se asume que el dominio del colegio ya esta comprado y gestionado por el cliente.
- Se asume que el informante tiene conocimientos basicos de DNS, variables de entorno y dashboards web.
- Se asume que la tabla `configuracion` fue creada directamente en Supabase SQL Editor y no a traves del archivo de schema.

---

*Fin del documento de transferencia.*
