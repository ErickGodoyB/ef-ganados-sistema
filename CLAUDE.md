# CLAUDE.md

Reglas del proyecto para trabajar en este repositorio.

## Proyecto

TFG "Sistema de gestión bovina" para EF Ganados (Curuguaty, Paraguay).

- **Backend**: Spring Boot (Java 21), paquete base `com.efganados.sistemabovino`
  con subpaquetes `model`, `repository`, `service`, `controller`, `config`.
  Base de datos PostgreSQL.
- **Frontend**: React (JavaScript) con Vite.

## Comentarios

- Backend: Javadoc en clases y métodos públicos.
- Frontend: JSDoc en español.
- Comentar el **porqué**, no lo obvio (qué decisión hay detrás, no qué hace
  la línea literalmente).

## Entidades JPA

- Los atributos escalares propios de cada tabla llevan el prefijo de la
  entidad: `ani_` (Animal), `per_` (Persona), `usu_` (Usuario), `rz_` (Raza),
  `grp_` (Grupo), `sb_` (SubGrupo), `pesa_` (Pesajes).
- Las relaciones (`@ManyToOne`/`@OneToOne`) **no** llevan prefijo, porque no
  son columnas propias sino referencias a otra entidad.

## Reglas de negocio

- El peso actual **nunca** se guarda como campo en `Animal`: se calcula a
  partir del pesaje más reciente en `Pesajes` (o del peso inicial, si el
  animal todavía no tiene ningún pesaje registrado).
- **GMD** = (peso más reciente − peso anterior) / días entre los dos
  pesajes más recientes. Es `null` si hay menos de 2 pesajes. Es `0.0` si
  los días entre ambos son 0.
- **Apto para venta**: peso actual >= `Raza.rzPesoObjetivoVenta`.
- Los pesajes nunca se sobrescriben ni se borran en cascada.
- No implementar lógica de negocio por cuenta propia: pedir las reglas
  antes de asumir cómo se calcula o valida algo.

## API

- Rutas: `/api/{recurso}`.
- Errores: `400` con texto `"Falta el campo X"`, `404` con texto
  `"<Entidad> no encontrada con id: X"`, `409` para duplicados o
  eliminaciones no permitidas.
- Todo endpoint exige JWT, salvo `POST /api/auth/login`.

## Frontend

- Diseño mobile-first.
- Modo claro y oscuro obligatorio, mediante variables CSS (`index.css`);
  ninguna pantalla define colores fijos por su cuenta.
- Áreas táctiles de al menos 44×44px; inputs con `font-size` de al menos
  16px (evita el zoom automático de iOS).
- Sin scroll horizontal en ningún ancho.
- Accesibilidad: labels asociadas a los campos, atributos `aria-*`
  correspondientes, buen contraste de color (mínimo 4.5:1 para texto, 3:1
  para bordes/íconos/elementos de interfaz).
- La identidad de la empresa (nombre, subtítulo, logo) sale únicamente de
  `src/configuracion/marca.js` — no escribir "EF Ganados" ni similares
  directamente en una pantalla.
- Toda llamada a la API pasa por `src/api/cliente.js`.
- No agregar dependencias nuevas sin autorización explícita. Las únicas
  autorizadas hasta ahora, fuera de lo que trae el proyecto base de Vite,
  son `lucide-react` (íconos) y `@fontsource-variable/inter` (tipografía
  Inter autoalojada).

### Paleta de marca

Verde oscuro `#183D09`, oliva `#738839`, crema `#EFE7D4`, verde azulado
`#497372`, celeste `#7BB3C4`. El crema reemplaza al blanco como fondo de
la app (tarjetas/modales usan un crema más claro derivado). El oliva y el
celeste no se usan nunca como color de texto sobre crema (no alcanzan
4.5:1): para eso se derivan variantes oscuras. Todos los colores viven
como variables en `index.css` (una copia para modo claro en `:root`, otra
para modo oscuro en `:root[data-tema='oscuro']`); ninguna pantalla define
un color de marca fijo por su cuenta. La barra lateral y el panel de
marca del login son siempre verde oscuro, sin importar el tema
claro/oscuro de la página (variables `--color-sidebar-*`, separadas de
las del resto de la app).

## Pruebas

- Antes de dar por terminado un cambio de **backend**, ejecutar
  `.\mvnw.cmd test` desde `backend/` (hoy son 29 pruebas; todas deben
  pasar).
- Antes de dar por terminado un cambio de **frontend**, ejecutar
  `npm run lint` y `npm run build` desde `frontend/`.
- Al escribir o ajustar pruebas, no modificar `src/main` sin avisar primero.

## Comandos (Windows/PowerShell)

- Usar `.\mvnw.cmd` (no `./mvnw` ni `mvn`) para todo lo del backend.

## Seguridad

- No escribir contraseñas ni claves reales en el repositorio.
- `app.jwt.secret` y `app.admin.password` actuales son valores de
  **desarrollo**: deben cambiarse antes de cualquier versión final/producción.
- `frontend/.env` no se versiona (está en `.gitignore`); solo se versiona
  `frontend/.env.example`.

## Alcance

Solo registro y seguimiento productivo (peso, cantidad de cabezas).
**Fuera de alcance**: salud animal, compra/venta, identificación por RFID.
