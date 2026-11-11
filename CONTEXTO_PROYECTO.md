# Sistema de Gestión Bovina — EF Ganados

Documento de contexto del proyecto. Sirve como referencia para el equipo y como
"memoria" para retomar el trabajo (con Claude Code, en otro chat, o con cualquier
colaborador nuevo).

**Última actualización: 2026-11-11.**

## 1. Contexto general

- **TFG**: Universidad Nacional de Canindeyú, Facultad de Ciencias y Tecnología,
  carrera de Análisis de Sistemas.
- **Autor**: Erick Gabriel Godoy Benítez.
- **Tutor**: Gabriel González Rojas.
- **Cliente real**: EF Ganados, microempresa ganadera en Curuguaty, Paraguay.
- **Perfil del cliente**: el dueño actúa como *habilitador* — compra lotes de
  ganado para un patrón, selecciona los mejores animales, los pesa al ingreso,
  vuelve a pesarlos después de un tiempo, y decide venta según el % de engorde
  (Ganancia Media Diaria).
- **Problema**: registro manual en cuadernos y planillas Excel — lento, con
  errores de transcripción, no escala con el crecimiento del hato.
- **Alcance**: registro y seguimiento productivo (peso, cantidad de cabezas).
  **Excluye** explícitamente salud animal y módulos de compra/venta.
- **Metodología**: Modelo en Cascada (Requerimientos → Diseño → Implementación
  → Pruebas → Despliegue).
- **Stack tecnológico**: Spring Boot (Java 21) + React + PostgreSQL. Editor:
  VS Code + Claude Code.

## 2. Requisitos funcionales (RF)

| Código | Descripción |
|---|---|
| RF001 | Registrar un nuevo animal con caravana o ID interno, raza, fecha de ingreso y peso inicial. |
| RF002 | Registrar pesajes periódicos de un animal, asociados a fecha y responsable del registro. |
| RF003 | Calcular automáticamente la Ganancia Media Diaria (GMD), tomando los dos pesajes más recientes, sin importar el intervalo entre ellos. |
| RF004 | Agrupar animales por lote (Grupo/SubGrupo) según fecha de ingreso u origen. |
| RF005 | Generar alertas cuando un animal alcance el rango de peso/GMD definido como apto para venta (umbral definido por raza). |
| RF006 | Generar reportes comparativos de ganancia de peso entre animales de un mismo lote. |
| RF007 | Mostrar la evolución de peso de un animal en un gráfico a lo largo del tiempo. |
| RF008 | Exportar los reportes en formato PDF. |
| RF009 | Permitir el inicio de sesión de usuarios registrados (control de acceso). |
| RF010 | Visualizar el listado de animales registrados, con búsqueda por caravana y filtrado por lote. |
| RF011 | Permitir el registro incremental de pesajes por lote: se agregan animales de forma individual a una sesión de pesaje, mostrando en tiempo real un resumen estadístico (cantidad, total, promedio, mínimo, máximo), persistiendo todo recién al confirmar. Incluye también la opción de pesaje individual (fuera de un lote). |

## 3. Requisitos no funcionales (RNF)

| Código | Descripción |
|---|---|
| RNF001 | Accesible desde navegadores de escritorio y dispositivos móviles (responsive). |
| RNF002 | Interfaz simple e intuitiva, para personal con baja experiencia digital. |
| RNF003 | Tiempo de respuesta aceptable (medido con Thunder Client). |
| RNF004 | Integridad y persistencia de datos en PostgreSQL. |
| RNF005 | Validación de campos de entrada (ej. peso numérico, sin caracteres inválidos). |
| RNF006 | Contraseñas de usuario almacenadas cifradas. |

## 4. Modelo de datos (Entidad-Relación)

Entidades y relaciones (ver también el modelo DBML usado en dbdiagram.io):

- **Persona**(per_id PK; per_nombre, per_apellido, per_ruc, per_ci, per_tipo,
  per_telefono, per_correo, per_direccion)
  — se conecta **3 veces** al resto del modelo, cada vez con un rol distinto:
  como dueño de Animal, como responsable de Pesajes, y opcionalmente como Usuario.
  `per_tipo` es un rol de negocio con valores cerrados **`PROPIETARIO`** /
  **`EMPLEADO`** (String simple, no enum de Java) — distingue quién es dueño de
  animales de quién solo opera el sistema; dejado abierto para agregar
  `CLIENTE` en el futuro si el alcance crece a compra/venta. No confundir con
  CI/RUC, que ya indican por sí solos si la persona es física o jurídica.
- **Usuario**(usu_id PK; per_id FK 1↔0..1; usu_nombre, usu_password)
- **Raza**(rz_id PK; rz_descripcion, **rz_pesoObjetivoVenta** — define el umbral de venta por raza, usado en RF005)
- **Grupo**(grp_id PK; grp_descripcion) → 1:N → **SubGrupo**
- **SubGrupo**(sb_id PK; grp_id FK; sb_descripcion)
- **Animal**(ani_id PK; per_id FK [dueño], rz_id FK, sb_id FK; ani_caravana,
  ani_fechaIngreso, ani_pesoInicial, ani_fechaEgreso, ani_observacion)
  — **corrección del tutor**: no se guarda `pesoActual` como campo propio (para
  evitar datos duplicados/desincronizados); el "peso actual" siempre se calcula
  consultando el pesaje más reciente en la tabla `Pesajes` (o `pesoInicial` si
  el animal todavía no tiene ningún pesaje registrado).
- **Pesajes**(pesa_id PK; ani_id FK, per_id_responsable FK; pesa_fecha, pesa_peso, pesa_observaciones)

## 5. Diagrama de clases (comportamiento)

- **Animal**: `calcularGMD()` y `estaAptoParaVenta()` — ambos consultan el/los
  pesaje(s) más reciente(s) en `Pesajes`, no un campo propio de `Animal`.
  `registrarPesaje(peso, fecha, responsable)` — crea un nuevo registro en
  `Pesajes`; ya no actualiza ningún campo dentro de `Animal`.
- **Usuario**: `iniciarSesion()`, `cerrarSesion()`
- **Persona**, **Raza**, **Grupo**, **SubGrupo**, **Pesajes**: sin métodos propios de negocio (solo almacenan datos)

## 6. Arquitectura

3 capas: **Presentación** (React) → **Lógica de negocio** (Spring Boot: Controladores,
Servicios, Repositorios, Entidades, Seguridad) → **Base de datos** (PostgreSQL).

5 módulos funcionales: **Autenticación**, **Registro de Ganado**, **Pesajes**, **Alertas**, **Reportes**.

## 7. Diseño de interfaz (UX)

Patrón general en todas las pantallas: sidebar izquierdo, listado con buscador +
filtro + botón "+ Nuevo" que abre un **modal** (no página completa), respaldado
en ISO 9241-11 y los heurísticos de Nielsen.

| Módulo | Estado | Detalle |
|---|---|---|
| Login | ✅ Terminado y programado en React (2026-10-17) | Usuario, contraseña (con botón mostrar/ocultar), mensaje de error bajo los campos, modo claro/oscuro; probado en PC y en celular Android |
| Animales — Listado | ✅ Terminado (estilo real en draw.io) | Caravana, Raza, Lote, Peso actual, Estado (badge "Apto para venta") |
| Animales — Modal Nuevo animal | ✅ Terminado (estilo real) | Caravana, Raza (+ "nuevo"), Lote (+ "nuevo"), Fecha ingreso, Peso inicial |
| Animales — Detalle: historial de pesajes | ✅ Construido y probado (2026-11-07) | Sección "Historial de pesajes": fila de ingreso (fecha y peso inicial) y cada pesaje con código de sesión, peso, diferencia, GMD y responsable; botón "Ver sesión" que lleva a Pesajes con el código en el buscador. El gráfico de evolución queda para Reportes (RF007) |
| Pesajes — Listado | ✅ Construido y probado (2026-10-29/31) | Una fila por sesión: código de sesión (chip `S-AAMMDD-N`, primera columna), fecha, lote, cantidad, promedio, mínimo, máximo. Buscador, filtro por lote, filtro **Intervalo** (botón con calendario, atajos Hoy/7 días/30 días/Este mes), orden, paginación, columnas opcionales; selector de vistas **Sesiones / Anulados** |
| Pesajes — Detalle de sesión | ✅ Construido y probado | Resumen (cantidad, total, promedio, mínimo, máximo, GMD promedio), lista de animales con peso anterior y GMD (negativo con ícono y texto "pérdida de peso"), editar peso, agregar animal (solo del mismo lote), **Anular pesaje** (con motivo), **Anular sesión**, **Cambiar fecha** |
| Pesajes — Modal Nuevo pesaje | ✅ Construido y probado (2026-11-07) | Pestañas "Por lote" / "Individual"; resumen en vivo; buscador de animal que explica el motivo cuando no es elegible; lista acumulada editable; guardado todo o nada; alta rápida de animal (vuelve con lote, fecha y animal elegidos, peso inicial precargado y foco en "+ Agregar"); alta rápida de **lote** con "+"; selector de **Responsable** (por defecto, el usuario actual); avisos sin bloqueo (peso menor, pesaje retroactivo) |
| Mi cuenta | ✅ Construido y probado (2026-10-31) | Ruta `/cuenta`: datos del usuario y cambio de clave (clave actual, nueva y confirmación) |
| Catálogos — Razas | ✅ Construido y probado (2026-11-10) | Ruta `/catalogos/razas`: listado con cantidad de animales, alta, edición y borrado; al cambiar el peso objetivo de una raza con animales pide confirmar ("afecta a N animales"); eliminar bloqueado si tiene animales |
| Catálogos — Grupos y lotes | ✅ Construido y probado (2026-11-10) | Ruta `/catalogos/grupos-y-lotes`: tarjetas desplegables por grupo con sus lotes y conteos (total y activos); alta, edición, cambio de grupo de un lote y borrado seguro; el menú lateral tiene la sección desplegable **Catálogos** |
| Catálogos — Personas | ✅ Construido y probado (2026-11-11); falta validar el formato de teléfono, CI y RUC | Ruta `/catalogos/personas`: listado con buscador, filtro por tipo (Propietarios / Empleados), orden y paginación; alta y edición con errores de CI/RUC junto al campo; borrado bloqueado si es dueña de animales, responsable de pesajes o tiene usuario de acceso |
| Reportes | ❌ No iniciado | RF006 (comparativo por lote), RF007 (gráfico evolución), RF008 (exportar PDF) |
| Vista mobile | ✅ Login verificado en celular Android real (2026-10-18) | Regla fija: toda pantalla nueva se diseña mobile-first y se prueba en el celular (RNF001) |

## 8. Decisiones de diseño importantes (y por qué)

- El **peso objetivo de venta** vive en `Raza` (no en Animal ni SubGrupo), porque el rango ideal varía según la raza.
- El **registro de pesaje** no persiste nada hasta tocar "Guardar" — permite cancelar sin dejar datos a medias.
- Cada pesaje es un **registro nuevo**, nunca se sobrescribe uno viejo — necesario para poder calcular la GMD comparando pesajes.
- Se descartaron (movidos a "futuras investigaciones", **no forman parte del alcance actual**): módulo de salud/farmacia, identificación por chip/RFID, calendario por colores.
- RF010 y RF011 se agregaron durante el proceso de diseño (no estaban en el anteproyecto original) — están documentados como evolución natural de RF001/RF002, no como expansión de alcance.
- **Corrección del tutor**: `Animal` no guarda `pesoActual` como campo propio — se calcula siempre a partir de `Pesajes` (el pesaje más reciente), evitando duplicar y desincronizar datos. Aplica a `Animal.java`, al diagrama ER, al diagrama de clases, y a la lógica de `calcularGMD()`/`estaAptoParaVenta()`.
- **Modo claro y oscuro (regla de todo el proyecto)**: toda pantalla debe funcionar en ambos temas. El tema inicial sigue la preferencia del sistema operativo (`prefers-color-scheme`), se puede cambiar con el botón de tema y se recuerda en `localStorage`. Los colores salen de variables CSS en `index.css`; no se escriben colores fijos en cada pantalla.
- **Paleta de marca (decidida 2026-10-19, a partir del logo de EF Ganados)**: `#183D09` (verde oscuro), `#738839` (verde oliva), `#EFE7D4` (crema, reemplaza al blanco como fondo), `#497372` (verde azulado) y `#7BB3C4` (celeste). Observación de contraste: el oliva y el celeste no sirven como color de texto sobre crema; se usan para acentos, bordes, íconos y fondos, y se derivan variantes más oscuras para texto. El modo oscuro se deriva de los mismos colores (fondos verde muy oscuro, texto crema). Todo color sale de variables CSS en `index.css`. Dependencias nuevas autorizadas para el frontend: `lucide-react` (íconos) y `@fontsource-variable/inter` (tipografía); cualquier otra requiere aprobación.
- **Mobile-first (regla de todo el proyecto, RNF001)**: estilos base para celular y `@media (min-width)` para pantallas grandes; sin scroll horizontal; `min-height: 100dvh`; inputs de al menos 16 px (evita el zoom de iOS); áreas táctiles de al menos 44x44 px.
- **Marca configurable (decisión 2026-10-18)**: para el TFG el sistema es de EF Ganados. Nombre, subtítulo y logo deben estar definidos en un solo lugar del frontend (pendiente centralizarlos) para poder cambiarlos fácilmente. Una pantalla "Configuración de la empresa" (editar nombre y logo desde el sistema) queda como **mejora futura / trabajo futuro**, fuera del alcance actual.
- **"Dueño" no es "proveedor" (aclaración 2026-10-19)**: el dueño (`Animal.per_id`, `Persona.per_tipo = PROPIETARIO`) es el patrón por cuenta de quien se gestiona el animal. El proveedor/origen (a quién o dónde se compró) no es un campo aparte: RF004 agrupa por "fecha de ingreso u origen", y eso se expresa con el nombre del Grupo/Lote (por ejemplo "Compra Estancia X – Oct 2026"). Compra/venta como módulo está fuera del alcance.
- **Salida del animal (propuesta 2026-10-19, pendiente de construir)**: se registra con `aniFechaEgreso` más un motivo (Venta u Otro); no crea una entidad de venta. Reglas propuestas: la fecha de salida no puede ser anterior al ingreso; un animal con salida no admite pesajes nuevos; el listado muestra por defecto los activos, con filtro para ver los que salieron; se puede deshacer con "Reactivar". El detalle del animal se abre en un modal con Editar, Registrar salida y Eliminar (solo sin pesajes).
- **Convención de nombres en las entidades JPA**: todo atributo escalar propio de la tabla lleva el prefijo de la entidad (ej. `ani_...` en Animal, `per_...` en Persona). Las relaciones (`@ManyToOne`/`@OneToOne`, ej. `duenio`, `raza`, `subGrupo`) **no** llevan prefijo, porque no son columnas propias sino referencias a otra entidad.
- **Sesión de pesaje = concepto derivado (2026-10-28)**: misma `pesaFecha` y mismo lote del animal (null = "Sin lote"); no hay tabla ni columna de sesión. Consecuencia conocida: si un animal cambia de lote después, sus pesajes viejos pasan a mostrarse en la sesión del lote nuevo. Decisión 2026-10-31: las sesiones se identifican con un **código derivado y estable** `S-AAMMDD-N` (año de 2 cifras; N = id del lote, 0 = sin lote; desde 2026-11-05, antes era `S-AAAAMMDD-N`). Una numeración real o la acción "finalizar sesión" requerirían una tabla de sesiones: queda como trabajo futuro.
- **Una sesión nunca mezcla lotes ni fechas**: el lote elegido filtra los animales disponibles; pesar animales de varios lotes el mismo día genera una sesión por lote. El pesaje **Individual** sirve para cualquier animal y en el listado aparece como una sesión de 1 animal (o se suma a la del día).
- **Anulación lógica de pesajes (2026-10-30)**: el sistema no borra pesajes. Un pesaje tiene estado `ACTIVO` o `ANULADO` (`pesaEstado`), con fecha de anulación, motivo (3 a 255 caracteres) y quién lo anuló. Un pesaje anulado no cuenta en peso actual, GMD, resumen, listados ni reportes; se ve en la vista **Anulados**. Se puede anular un pesaje o una sesión completa. El `DELETE` físico se eliminó. "Finalizar" (bloquear la edición) y "devolución" no se adoptan (ver trabajo futuro). Para animales se usará el mismo patrón en el tramo de Salida del animal.
- **Un pesaje activo por animal por día (2026-10-30)**: intentar un segundo pesaje activo del mismo animal en la misma fecha devuelve 409 ("Editá ese pesaje o anulalo"). Un pesaje anulado no cuenta. Para corregir un peso se edita el pesaje desde el detalle de la sesión.
- **Cambiar la fecha de una sesión (2026-10-30)**: mueve todos sus pesajes activos de una vez (todo o nada). Rechaza fecha futura, igual a la actual, anterior al ingreso de algún animal (400) y animales que ya tengan pesaje activo en la nueva fecha (409). Si ya existe una sesión del mismo lote en esa fecha, se fusionan.
- **Un animal pesado con peso menor al anterior es válido**: puede bajar de peso (transporte, ayuno, enfermedad, otra balanza). Se avisa sin bloquear y el GMD negativo se muestra con signo, color, ícono y texto "pérdida de peso" (nunca solo color).
- **CONSTRUIDO Y PROBADO (2026-11-05): el peso inicial es el punto de partida del GMD.** Hasta ahora el GMD solo usaba dos pesajes y un animal con un único pesaje mostraba "—". Regla nueva: si un pesaje no tiene pesaje activo anterior, su "peso anterior" es `aniPesoInicial` y su fecha anterior es `aniFechaIngreso`; GMD = (peso − anterior) / días; con 0 días el GMD es `null` (no "0.0"). Esto reemplaza la nota "GMD nunca usa el peso inicial" de la sección 10. El detalle de sesión agregará `pesoAnteriorEsIngreso` y `fechaPesoAnterior`. `cantidadPesajes` sigue contando solo pesajes.
- **Pesaje retroactivo (2026-11-05)**: cargar un pesaje con fecha anterior al último pesaje activo del animal es válido (por ejemplo, un pesaje anotado en el cuaderno que se olvidó). El pesaje se ubica en su lugar de la historia, el GMD de los posteriores se recalcula solo (el GMD nunca se guarda) y el peso actual no cambia. La interfaz **avisa sin bloquear**, usando `fechaUltimoPesaje` del resumen de animales: "<caravana> ya tiene un pesaje posterior (fecha, sesión S-AAMMDD-N)". Ese aviso reemplaza al de "peso menor al último". Verificado el 2026-11-06: en "Individual" guarda sin problema y el pesaje posterior recalcula su "peso anterior"; el bloqueo reportado antes no se pudo reproducir (probablemente era la regla de un pesaje por día).
- **Peso inicial ≠ pesaje**: el peso inicial es el peso de ingreso del animal y no cuenta como pesaje. Si se carga un pesaje con el mismo peso el mismo día del ingreso, se crea un pesaje real (diferencia 0,0 kg y GMD "—" porque no pasó ningún día). Tras el alta rápida de un animal desde el modal, el peso inicial queda precargado en el campo de peso para confirmar con un clic.
- **Responsable del pesaje (2026-11-06)**: es la persona que realizó el pesaje. Se asigna por defecto a la persona del usuario que inició sesión (`/api/auth/yo`) y se puede cambiar en "Nuevo pesaje" (ambas pestañas) con un selector de personas; en una sesión por lote el mismo responsable vale para todos los animales. El detalle de sesión puede mostrarlo (casilla "Mostrar responsable"). Limitación: las personas (empleados) solo se crean hoy desde la API; la pantalla de Personas está prevista en Catálogos.
- **Historial de pesajes por animal (2026-11-06)**: se ve en el detalle del animal. El código de sesión de cada fila usa el lote **actual** del animal (el sistema no guarda el lote que tenía en cada pesaje).
- **Alta rápida de lote desde Nuevo pesaje (2026-11-06)**: cuando llega un lote nuevo, el flujo real es crear el lote, registrar los animales y pesarlos; por eso el selector de lote de "Por lote" tiene el botón "+".
- **Orden de los próximos tramos (2026-11-07)**: Catálogos (Razas, Grupos y lotes, Personas) → Salida del animal → Inicio con alertas (RF005) → Reportes (RF006 a RF008, con el gráfico de evolución del peso) → idioma pt-BR.
- **Cambio de clave (2026-10-30)**: `PUT /api/auth/clave`; clave actual incorrecta devuelve **400** (no 401, porque el frontend interpreta 401 como sesión vencida). Largo mínimo configurable en `app.seguridad.clave-minima` (hoy 5; subir a 8 o más antes del despliegue).
- **Idioma portugués (brasileño)**: la mayoría de los usuarios del rubro son brasileños. Se hará como tramo propio cuando las pantallas principales estén estables (diccionarios es / pt-BR propios, sin librería, selector de idioma, fechas y números con `Intl`, y mensajes del servidor traducibles). Las traducciones al portugués las redacta Claude y debe revisarlas un hablante nativo.
- **Código comentado**: de ahora en adelante, toda clase de entidad lleva un comentario Javadoc breve arriba (qué representa) y un comentario por atributo cuando su propósito no es obvio a simple vista (ej. por qué un campo es único, o qué significa un valor). Pendiente: agregar retroactivamente a `Animal`, `Persona`, `Usuario` y `Raza`, ya revisadas antes de tomar esta decisión.

## 9. Estado del informe (Overleaf / LaTeX)

- ✅ Cap. 1 (Introducción), Cap. 2 (Marco teórico y antecedentes)
- ✅ Cap. 3.1–3.3.1 (Enfoque, Metodología, Fase 1 — Requisitos con tablas RF/RNF)
- ✅ Fase 2 — Diagramas: clases, entidad-relación, arquitectura de módulos (insertados)
- ✅ Fase 2 — Mockups: Login, Animales (listado + modal) insertados
- ⏳ Fase 2 — Mockups de Pesajes: listado armado en estilo real, falta insertarlo en LaTeX; modal y detalle de sesión faltan construirse
- ❌ Fase 2 — Mockups de Reportes: no iniciado
- ❌ Cap. 4 (Resultados) y Cap. 5 (Conclusión): todavía tienen texto de plantilla, sin reemplazar
- ⏳ Pendiente menor: confirmar si se aclara el cambio de autoría (el anteproyecto tenía 2 autores, el informe final solo 1)
- ⏳ Pendiente opcional: agregar cita de ISO 9241-11 y Nielsen en el marco teórico (texto ya redactado, falta pegar y agregar referencias bibliográficas)
- ⏳ Pendiente: revisar si la sección del diagrama entidad-relación ya tiene un `\label{...}` puesto (para poder referenciarla con `\ref{}`); si no tiene, agregar `\label{sec:modelo_datos}` justo debajo de su título. Necesario antes de insertar la nueva subsección "Lógica de negocio: cálculo de indicadores" (texto LaTeX ya redactado — fórmulas de GMD y aptitud para venta, con los casos límite de 0/1/2+ pesajes), que va después del diagrama de clases.

## 10. Estado del desarrollo (código)

- **Entorno instalado** (PC principal): JDK 25 (compatible con proyecto configurado en Java 21), Node.js LTS, Git, VS Code + "Extension Pack for Java" + extensión oficial **Claude Code** (`anthropic.claude-code`)
- **Repositorio**: GitHub privado `ef-ganados-sistema`, con carpeta `backend/` (proyecto Spring Boot: dependencias Web, Data JPA, PostgreSQL Driver, Security, Lombok)
- **PostgreSQL**: instalado, base `efganados` creada. `application.properties` configurado (datasource + `ddl-auto=update`). Las 7 tablas ya existen en la base, generadas automáticamente por Hibernate a partir de las entidades, con FKs y constraints `unique`/`not null` correctas.
- **Corrección de paquetes**: la clase principal `SistemaBovinoApplication` estaba en el paquete `com.efganados.sistema_bovino` (con guión bajo), mientras que las entidades estaban en `com.efganados.sistemabovino.model` (sin guión bajo) — dos paquetes distintos no anidados, por lo que Spring Boot no detectaba las entidades y no creaba las tablas. Se corrigió moviendo `SistemaBovinoApplication.java` dentro de `com.efganados.sistemabovino` (paquete base único = `com.efganados.sistemabovino`). Importante: todo código nuevo (repositorios, servicios, controladores) debe crearse como subpaquete de `com.efganados.sistemabovino` para que el auto-scan de Spring Boot lo detecte.
- **Frontend (Vite + React)**: proyecto creado el 2026-10-16 en `frontend/` (Vite 8, React, ESLint; Node v24.21.0, npm 11.19.0). Se arranca con `npm run dev` desde `frontend` y abre en `http://localhost:5173` (el mismo origen que permite el CORS del backend). Verificado: se ve la página inicial de Vite y React y el contador funciona. **Pantalla de login hecha (2026-10-17)**, probada en navegador (9 de 9 puntos aprobados) y en celular Android. Estructura en `frontend/src/`: `api/cliente.js` (`fetch` con `peticionPublica` para el login y `peticionProtegida` con `Authorization: Bearer`; ante un 401 limpia la sesión y vuelve a `/login`; si `VITE_API_URL` no está definida usa `<protocolo>//<host de la página>:8080`), `auth/` (`sesionAlmacenada.js` en `localStorage`, `contextoAuth.js`, `AuthContext.jsx`, `useAuth.js`, `RutaProtegida.jsx`), `tema/` (`contextoTema.js`, `TemaContext.jsx`, `useTema.js`, `BotonTema.jsx`), `paginas/` (`Login.jsx`, `Inicio.jsx` provisional con "Cerrar sesión"). Rutas: `/login` pública, `/` protegida. Logo desde `public/logo.png` con respaldo "EF" (todavía no hay `logo.png`). Mensajes: 401 "Usuario o contraseña incorrectos"; sin conexión "No se pudo conectar con el servidor". Atajos: foco inicial en Usuario, Enter en Usuario pasa a Contraseña, Enter en Contraseña envía.
  - **`.env`**: archivo local de configuración, NO se sube a Git (está en `.gitignore`); se sube `.env.example` como plantilla. En una máquina nueva, copiar `.env.example` como `.env`. `VITE_API_URL` es opcional (solo si el backend está en otra dirección).
  - **Prueba desde el celular** (misma red wifi): iniciar el backend, ejecutar `npm run dev:red` en `frontend` (script `vite --host`) y abrir `http://<IP-de-la-PC>:5173` en el celular. Requisitos: IP fija en la PC y firewall de Windows con los puertos 5173 y 8080 abiertos. El CORS del backend acepta, con `allowedOriginPatterns`, `localhost`, `127.0.0.1`, `192.168.*.*` y `10.*.*.*` en el puerto 5173, configurable en `app.cors.origenes-permitidos` (en producción limitarlo al dominio real).
  - **Marco de la aplicación (2026-10-18)**: `layout/LayoutPrincipal.jsx` + `BarraLateral.jsx` envuelven las rutas protegidas (`/animales`, `/pesajes`, `/reportes`; `/` redirige a `/animales`; la pantalla Inicio provisional se eliminó). Barra lateral fija desde 1024 px; por debajo, botón ☰ que abre un panel con fondo oscurecido (se cierra con Escape, fondo o al tocar un acceso; el foco queda atrapado dentro). Pesajes y Reportes muestran "Próximamente". Probado en PC y celular.
  - **Listado de animales (RF010, 2026-10-18)**: `paginas/Animales.jsx` y carpeta `paginas/animales/` (componentes `TablaAnimales`, `TarjetaAnimal`, `PanelOpciones`, `Paginacion`, `EstadoBadge`, `LoteInfo`, `ValorGmd`; hooks `useAnimalesResumen` y `usePreferenciasListadoAnimales`). Consume `GET /api/animales/resumen`. Buscador por caravana (sin distinguir mayúsculas; busca el texto dentro de la caravana), filtros por lote y por estado (aptos / no aptos), orden por columna (los nulos van al final), paginación en el cliente (10/25/50) con "Mostrando X–Y de Z", y panel de Opciones (⚙) con columnas visibles y filas por página (preferencias en `localStorage`, clave `preferenciasListadoAnimales`). Tabla desde 768 px y tarjetas en pantallas chicas. Limitación conocida: el filtro de lote agrupa por el nombre (el resumen no trae `subGrupoId`). Pruebas manuales aprobadas con 29 animales.
  - **Datos de prueba**: `scripts/cargar_animales_prueba.ps1` crea por la API 25 animales `TEST-01` a `TEST-25` (razas Brahman y Nelore con objetivo 480 kg, lotes A y B, 0 a 3 pesajes; algunos aptos). Se ejecuta con `powershell -ExecutionPolicy Bypass -File .\scripts\cargar_animales_prueba.ps1` desde la raíz del repo y se puede repetir sin duplicar. Para borrarlos hay que usar pgAdmin (la API no borra animales con pesajes): `DELETE FROM pesajes WHERE ani_id IN (SELECT ani_id FROM animal WHERE ani_caravana LIKE 'TEST-%'); DELETE FROM animal WHERE ani_caravana LIKE 'TEST-%';`. El script trae la clave de desarrollo por defecto; cambiarla antes de la versión final.
  - Nota de Windows: en PowerShell hizo falta `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` para poder ejecutar `npm`.
- **Entidades JPA**: las 7 clases revisadas y corregidas, todo commiteado y pusheado a GitHub:
  - `Animal`: sin `pesoActual` (corrección del tutor aplicada).
  - `Persona`: prefijo `per_` en todos los atributos escalares.
  - `Usuario`: `unique = true` en `per_id` (FK a Persona) y en `usuNombre`.
  - `Raza`: `rzDescripcion` única y `nullable = false`; `rzPesoObjetivoVenta` `nullable = false`.
  - `Grupo`: `grpDescripcion` `nullable = false`. Javadoc/comentarios agregados (primera clase con el nuevo estándar de comentarios).
  - `SubGrupo`: `sbDescripcion` `nullable = false`, con comentarios.
  - `Pesajes`: `pesaFecha` y `pesaPeso` `nullable = false`; columna FK de responsable renombrada a `per_id_responsable` (para diferenciarla claramente de `Animal.per_id`, que es el dueño); con comentarios.
- **Repositorios**: generados y verificados (7 interfaces en `repository/`), commiteados y pusheados.
- **`AnimalService`**: implementado y verificado en `service/`, compila sin errores ni warnings. Métodos: `pesoActual()`, `calcularGMD()`, `estaAptoParaVenta()`, `registrarPesaje()`, `buscarPorId()`. Lógica confirmada exactamente como se definió (**regla original; la parte "el GMD nunca usa el peso inicial; `null` con <2 pesajes" fue reemplazada el 2026-11-05 (sección 8): el peso inicial a la fecha de ingreso es el punto de partida**; 0.0 si los días son 0 entre dos pesajes). También se agregó `findTop2ByAnimal_AniIdOrderByPesaFechaDesc()` en `PesajesRepository`. Todo commiteado y pusheado.
- **Controladores REST**: generados y compilando sin errores/warnings en `controller/`:
  - CRUD simples: `PersonaController` (`/api/personas`), `UsuarioController` (`/api/usuarios`), `RazaController` (`/api/razas`), `GrupoController` (`/api/grupos`), `SubGrupoController` (`/api/subgrupos`).
  - `AnimalController` (`/api/animales`): CRUD vía `AnimalRepository` + `GET /{id}/gmd`, `GET /{id}/apto-venta`, `POST /{id}/pesajes` (record `NuevoPesajeRequest(peso, fecha, responsableId)`) vía `AnimalService`.
    - **Opción B aplicada**: `POST` y `PUT` reciben el record `AnimalRequest(duenioId, razaId, subGrupoId, aniCaravana, aniFechaIngreso, aniPesoInicial, aniFechaEgreso, aniObservacion)`, con solo IDs en vez de objetos anidados (esto resolvió el error `Cannot map null into type double`). Validaciones: 400 con mensaje `Falta el campo X` si falta un campo obligatorio o la caravana está en blanco; 404 (`... no encontrada con id: X`) si un ID no existe; 409 `Ya existe un animal con la caravana: X` si la caravana está repetida (en el `PUT`, el animal puede conservar la suya); 201 al crear. `registrarPesaje` devuelve 400 si falta `responsableId`.
    - **Caravana única**: `Animal.aniCaravana` es `@Column(nullable = false, unique = true)`; `AnimalRepository` tiene `existsByAniCaravana()` y `existsByAniCaravanaAndAniIdNot()`. Con `ddl-auto=update` Hibernate NO creó la restricción en la base ya existente, así que se agregó a mano en pgAdmin: `ALTER TABLE animal ADD CONSTRAINT uk_animal_ani_caravana UNIQUE (ani_caravana);` (si se recrea la base desde cero, Hibernate la genera solo).
  - **`GET /api/animales/resumen` (2026-10-18, para el listado RF010)**: devuelve `List<AnimalResumen>` (record en `AnimalController`) con `aniId, aniCaravana, razaDescripcion, subGrupoDescripcion, grupoDescripcion, pesoActual, gmd, aptoVenta, aniFechaIngreso, aniFechaEgreso`. Todos los cálculos delegan en `AnimalService` (sin reglas nuevas). No filtra por `aniFechaEgreso` (qué hacer con animales egresados queda por decidir). Si no hay subgrupo, las descripciones van `null`. La búsqueda por caravana y el filtro por lote los hace el frontend. 35 pruebas automáticas aprobadas; CP30 aprobado en Thunder Client.
  - `PesajesController` (`/api/pesajes`): solo lectura (`GET` todos, `GET /{id}`) — la creación de pesajes es exclusivamente vía `AnimalController`, a propósito.
  - **Backend de Pesajes (2026-10-28, 59/59 pruebas, CP32 a CP46)**: la **sesión de pesaje es un concepto derivado** (misma `pesaFecha` y mismo lote del animal; sin lote = "Sin lote"), sin entidad ni columna nuevas. Endpoints: `POST /api/pesajes/sesion` (`{fecha, responsableId, items:[{animalId, peso}]}`, transaccional todo o nada, 201 con los pesajes creados), `GET /api/pesajes/sesiones` (resumen por fecha y lote: cantidad, total, promedio, mínimo, máximo; consulta agregada JPQL), `GET /api/pesajes/sesiones/detalle?fecha=&subGrupoId=` (ítems con `pesaId, animalId, caravana, razaDescripcion, peso, pesoAnterior, gmd, responsableNombre, observaciones`; `subGrupoId` ausente = sin lote), `PUT /api/pesajes/{id}` (solo `peso` y `observaciones`, permitido aunque el animal tenga salida) y `DELETE /api/pesajes/{id}` (204/404; **eliminado el 2026-10-30, reemplazado por la anulación lógica**), y `GET /api/auth/yo` (`usuNombre, tipo, personaId, personaNombre`). Reglas en `AnimalService.registrarPesaje` (aplican al pesaje individual y a la sesión): peso > 0 y <= 2000; fecha no futura; fecha >= ingreso del animal; animal con `aniFechaEgreso` no admite pesajes (409). Clases nuevas: `PesajeService`, `ValidacionException` (400), `ConflictoException` (409), DTO `SesionPesajeResumen` e `ItemSesionPesaje` (paquete `dto`, porque se construyen dentro de una consulta JPQL).
  - **Decisiones de Pesajes (2026-10-28)**: el responsable es el usuario que registra (se obtiene de `/api/auth/yo`); un pesaje se puede **corregir** (peso y observación) y **eliminar** (cada pesaje sigue siendo un registro propio: la corrección no reemplaza el historial); en una sesión ya existente cada acción (agregar, modificar o eliminar un animal) se guarda al momento, mientras que "+ Nuevo pesaje" guarda la sesión completa con "Guardar" (todo o nada); el modal avisa, sin bloquear, si el peso nuevo es menor al último del animal.
  - **Backend: anulación, un pesaje por día, cambio de fecha y clave (2026-10-30/31, 96/96 pruebas)**: `EstadoPesaje` (enum `ACTIVO`/`ANULADO`) y campos `pesaEstado` (`varchar(20) default 'ACTIVO'`; con `ddl-auto=update` las filas existentes quedaron `ACTIVO`), `pesaAnuladoEn`, `pesaMotivoAnulacion` y relación `anuladoPor`. Endpoints nuevos: `PUT /api/pesajes/{id}/anular` ({motivo}), `PUT /api/pesajes/sesion/anular` ({fecha, subGrupoId, motivo}, devuelve {cantidad}), `GET /api/pesajes/anulados?desde=&hasta=` (DTO `ItemAnuladoPesaje`), `PUT /api/pesajes/sesion/fecha` ({fecha, subGrupoId, nuevaFecha}) y `PUT /api/auth/clave` ({claveActual, claveNueva}, 204). Editar un pesaje anulado devuelve 409. Todas las consultas de peso actual, GMD, anterior, cantidad, resumen, indicadores, sesiones y detalle consideran solo pesajes `ACTIVO`; `existsByAnimal_AniId` no filtra por estado (un animal con historial, aun anulado, no se puede borrar). Se verificó con test que el servidor ya rechazaba (400) fechas anteriores al ingreso. Nueva regla: `aniFechaIngreso` no puede ser posterior al primer pesaje activo del animal (400 con la fecha). Hueco conocido: el egreso (`aniFechaEgreso`) aún no se valida contra los pesajes (se resuelve en el tramo de Salida del animal).
  - **Frontend de Pesajes (2026-10-29/31)**: `paginas/Pesajes.jsx` y `paginas/pesajes/` (listado de sesiones, `ModalDetalleSesion`, `ModalNuevoPesaje`, `PestanaPorLote`, `PestanaIndividual`, `AgregarAnimalSesion`, vista de anulados), componentes compartidos nuevos en `componentes/`: `BuscadorAnimal` (combobox accesible; ofrece "Registrar animal nuevo" solo si la caravana no existe en todo el sistema y explica el motivo cuando el animal existe pero no es elegible), `Intervalo` (panel de rango de fechas con atajos; se cierra con clic afuera y Escape), `ValorDiferenciaPeso`; `ValorGmd` muestra "—" sin dato y ícono + texto "pérdida de peso" si es negativo. `Modal` ganó `tamano="grande"` y una trampa de foco que ignora elementos ocultos. `AuthContext` expone `personaId`/`personaNombre` desde `/api/auth/yo`. Mi cuenta en `/cuenta`. Pruebas manuales de interfaz: ver `CASOS_DE_PRUEBA.md`.
  - **GMD desde el ingreso y aviso retroactivo (2026-11-05/06, 100 pruebas de backend y 163 de frontend)**: `AnimalService.calcularGmdEntre(peso, fecha, pesoAnterior, fechaAnterior, anteriorEsIngreso)` (estático) concentra la regla del GMD para el resumen, `/gmd` y el detalle de sesión; con un solo pesaje activo se calcula contra `aniPesoInicial` y `aniFechaIngreso`; con 0 días contra el ingreso el GMD es `null` (entre dos pesajes reales sigue siendo 0.0). El detalle de sesión suma `pesoAnteriorEsIngreso` y `fechaPesoAnterior`. El resumen de animales suma `fechaUltimoPesaje` (último pesaje ACTIVO; `AnimalService.ultimoPesajeActivo` evita consultas duplicadas). Frontend: causa real del bug de la alta rápida (el modal desmontaba la pestaña al abrir el formulario; ahora la oculta con `hidden`, más dos carreras de foco entre efectos del padre y del hijo), código de sesión `S-AAMMDD-N` como chip en la primera columna (`utilidades/codigoSesion.js`), `ValorPesoAnterior` (etiqueta "ingreso"), peso inicial precargado tras el alta rápida, y aviso de pesaje retroactivo (`utilidades/pesajeRetroactivo.js`). Probado en pantalla el 2026-11-06 salvo el guardado retroactivo en Individual.
  - **Historial, responsable y lote rápido (2026-11-06/07, 105 pruebas de backend y 171 de frontend)**: backend: `GET /api/animales/{id}/pesajes?incluirAnulados=false` (DTO `ItemHistorialPesaje`, 13 campos: pesaId, fecha, peso, pesoAnterior, pesoAnteriorEsIngreso, fechaPesoAnterior, gmd, responsableNombre, observaciones, estado, motivoAnulacion, anuladoEn, anuladoPorNombre; orden ascendente por fecha e id; 404 si el animal no existe); la cuenta del "peso anterior" se extrajo a `PesajeService.calcularAnterior(Pesajes)` y la comparten el detalle de sesión y el historial, junto con `AnimalService.calcularGmdEntre`; un pesaje anulado nunca cuenta como anterior de otro. `AnimalController` ahora depende de `PesajeService`. Frontend: `HistorialPesajesAnimal.jsx`, `usePersonasResponsable` y `CampoResponsable` (select de personas con la actual preseleccionada; si `/api/personas` falla queda fijo en la actual), `AltaRapidaLote` reutilizado en "Por lote" (recarga lotes y aplica la confirmación de cambio de lote), `Pesajes.jsx` lee `?codigo=` para precargar el buscador, y `ModalDetalleAnimal` usa tamaño grande en la vista de detalle. Probado en pantalla el 2026-11-07. Limpieza: se eliminaron las 3 advertencias "Null type safety" del IDE reemplazando referencias a método por lambdas.
  - **Catálogos: Razas y Grupos y lotes (2026-11-09/10, 147 pruebas de backend y 205 de frontend)**: backend: `RazaService` (el controlador solo delega; orden de validación: campos obligatorios, rango de peso 0 a 2000, y al final la unicidad de la descripción sin distinguir mayúsculas, 409), `GET /api/razas/resumen` (`RazaResumen`: id, descripción, peso objetivo, `cantidadAnimales` con y sin salida), `DELETE /api/razas/{id}` con 409 si hay animales; `GrupoService` y `SubGrupoService`, `GET /api/grupos/resumen` (`GrupoResumen` con `LoteResumen` anidados: `cantidadAnimales` y `cantidadActivos`, lotes ordenados por descripción), lote con descripción única dentro de su grupo, grupo con descripción única, `DELETE` de lote con animales y de grupo con lotes bloqueados con 409; `POST/PUT /api/subgrupos` sigue aceptando el cuerpo anidado `{sbDescripcion, grupo:{grpId}}` que usa el alta rápida de lote. `GET /api/razas`, `/api/grupos` y `/api/subgrupos` no cambiaron de formato. Frontend: `BarraLateral` con sección desplegable **Catálogos**; `Razas.jsx` (tabla/tarjetas, `ModalFormularioRaza` con paso de confirmación de impacto solo si cambia el peso objetivo y hay animales, `ModalEliminarRaza`); `GruposYLotes.jsx` (`TarjetaGrupo` desplegable, `ModalFormularioGrupo`/`ModalFormularioLote`, `ModalEliminarGrupo`/`ModalEliminarLote`, buscador por grupo o lote que abre los grupos con coincidencias). Los formularios de animales ya pedían razas y lotes frescos al abrirse. Probado en pantalla el 2026-11-10.
  - **Catálogo de Personas (2026-11-10/11, 170 pruebas de backend y 218 de frontend)**: backend: `PersonaService` (el controlador solo delega); tipos permitidos en `PersonaService.TIPOS_PERMITIDOS` (`PROPIETARIO`, `EMPLEADO`; agregar `CLIENTE` es una línea); nombre y tipo obligatorios (mensajes "Falta el campo nombre" / "Falta el campo tipo"); apellido, RUC, CI, teléfono, correo y dirección vacíos se guardan como `null`; CI y RUC únicos si vienen (409); correo con formato básico (400); `GET /api/personas/resumen` (`PersonaResumen`: datos de la persona más `cantidadAnimales` como dueña, `cantidadPesajes` como responsable o anuladora de cualquier estado y `tieneUsuario`); `DELETE` bloqueado con 409 si es dueña de animales, figura en pesajes o tiene usuario, con un mensaje que nombra solo lo que corresponde. `GET /api/personas` y `/{id}` no cambiaron. Ninguna respuesta expone datos de usuario. Frontend: `Personas.jsx`, `tiposPersona.js` (constante única de tipos), tabla/tarjetas, `ModalFormularioPersona` (el 409 de CI o RUC se muestra junto al campo) y `ModalEliminarPersona`; el selector de dueño y el de responsable ya pedían las personas frescas al abrirse. Probado el 2026-11-11.
  - **Pendiente inmediato (2026-11-11)**: el teléfono aceptaba letras. Regla acordada: teléfono solo con dígitos, espacios y `+ - ( )`, máximo 20 caracteres y al menos 6 dígitos; CI y RUC con letras, números, puntos, guiones y espacios (máximo 20), para admitir documentos de clientes brasileños. Orden entregada, falta construirla y probarla.
  - **Pruebas del frontend (Vitest, 2026-10-30)**: dependencias de desarrollo autorizadas: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. Se ejecutan con `npm test` desde `frontend` (**135 pruebas, todas aprobadas**); la API se simula, nunca se llama al servidor real. Cubren funciones puras (resumen de sesión, diferencias, validaciones), `ValorGmd`, `ValorDiferenciaPeso`, `BuscadorAnimal`, `Intervalo`, y las pestañas del modal. Lo visual (diseño, celular, contraste, desbordes de CSS) se sigue verificando a ojo. Antes de cada commit importante: `.\mvnw.cmd test` (backend) y `npm test`, `npm run lint`, `npm run build` (frontend).
  - `GlobalExceptionHandler` (`@RestControllerAdvice`): mapea `IllegalArgumentException` (la que lanza `AnimalService.buscarPorId()`) a una respuesta 404 limpia, en vez de un 500 con stack trace.
  - Endpoints probados con Thunder Client: casos CP01 a CP25 aprobados (ver `CASOS_DE_PRUEBA.md`; capturas en `docs/pruebas/`, faltan las de CP19, CP21 y CP22). Cubren CRUD, validaciones 400/404/409, borrado, GMD (0, 1, 2 en la misma fecha y más de 2 pesajes), apto-venta y 404.
  - **Borrado de animales (decidido y aplicado)**: `DELETE /api/animales/{id}` devuelve 404 si no existe, **409** (`No se puede eliminar el animal: tiene pesajes registrados`) si tiene pesajes, y 204 si se borra. Para esto `PesajesRepository` tiene `existsByAnimal_AniId()` y `AnimalController` inyecta `PesajesRepository`. Razón: los pesajes son el historial del animal y la fuente de todos los cálculos; no se borran en cascada.
  - Pendiente menor: las respuestas JSON pueden traer `"hibernateLazyInitializer": {}` en algunas relaciones (inofensivo; se limpia más adelante con objetos de respuesta propios).
  - **Pendiente (commit)**: los cambios del borrado (con 409) deben estar commiteados y pusheados a `main`; verificar siempre que GitHub Desktop diga "Commit to main" (una vez los cambios quedaron en otra rama y hubo que fusionar un pull request en GitHub).
- **⚠️ `SecurityConfig` TEMPORAL (en curso)**: Spring Security bloquea todo por defecto (401 en GET, 403 por CSRF en POST/PUT/DELETE), lo que impide probar con Thunder Client. Se agrega una `SecurityConfig` en `config/` que deshabilita CSRF y permite todas las peticiones, **solo para desarrollo**. Debe reemplazarse por la autenticación real (RF009: login con `UsuarioRepository.findByUsuNombre()` y contraseñas cifradas, RNF006) antes de dar el sistema por terminado.
- **Pruebas automáticas (hechas)**: **170 pruebas JUnit + MockMvc en total al 2026-11-11** (147 con el catálogo de grupos y lotes y 170 con el de personas; antes: 121 con el catálogo de razas; 147 con el de grupos y lotes; antes: 59 al 2026-10-28; 92 tras la anulación, cambio de fecha y clave; 96 con la validación del ingreso; 99 con el GMD desde el ingreso; 100 con `fechaUltimoPesaje`; 105 con el historial por animal) y **218 de Vitest** en el frontend. Detalle histórico de las primeras 59: 59 pruebas JUnit + MockMvc (29 hasta la autenticación + 6 del endpoint `/resumen` + 3 del resumen ampliado + 21 de las sesiones de pesaje) en `src/test/java/com/efganados/sistemabovino/` (`AnimalControllerTest` 9, `PesajeControllerTest` 3, `IndicadoresControllerTest` 9, `AuthControllerTest` 7 y `SistemaBovinoApplicationTests` 1), todas aprobadas (21 en la primera ejecución; la 22 es la prueba de valor límite de apto-venta, agregada tras una mutación manual `>=` -> `>` que las 21 originales no detectaban). Usan H2 en memoria (`src/test/resources/application.properties`, `ddl-auto=create-drop`), nunca tocan PostgreSQL. Se ejecutan desde `backend` con `.\mvnw.cmd test` (en PowerShell hace falta el `.\`). Detalles de Spring Boot 4: MockMvc está en `org.springframework.boot.webmvc.test.autoconfigure`; Jackson 3 (`tools.jackson.databind.ObjectMapper`); el `pom.xml` no necesitó cambios. Se corrigió el paquete viejo de `SistemaBovinoApplicationTests` (`sistema_bovino` -> `sistemabovino`). Regla: antes de cada commit importante, correr `.\mvnw.cmd test`.
- **Autenticación (RF009, RNF006) — implementada (2026-10-14)**: JWT con HS256 (Nimbus, `spring-boot-starter-oauth2-resource-server`, sin filtro propio). `POST /api/auth/login` (`AuthController`, `LoginRequest`/`LoginResponse` como records) devuelve `{token, usuNombre, tipo}`; 401 con "Usuario o contraseña incorrectos" si falla; 400 si falta un campo. `TokenService` genera el token (subject = `usuNombre`, expiración `app.jwt.expiracion-horas=8`). `SecurityConfig` reescrita: stateless, CSRF off, solo el login es público, CORS para `http://localhost:5173`, `BCryptPasswordEncoder`. `SistemaBovinoApplication` excluye `UserDetailsServiceAutoConfiguration` (ya no aparece la contraseña autogenerada). `Usuario.usuPassword` es `WRITE_ONLY` en JSON; `UsuarioController` cifra al crear y solo reemplaza la contraseña en el PUT si llega una nueva. `AdminUsuarioInitializer` (CommandLineRunner) crea la persona y el usuario inicial (`app.admin.usuario=admin`, `app.admin.password=cambiar-esta-clave`, per_tipo `EMPLEADO`) si la tabla de usuarios está vacía. Probado con Thunder Client: CP26 a CP29 aprobados.
  - **Pendientes de seguridad**: cambiar `app.jwt.secret` y `app.admin.password` antes de la versión final (idealmente leerlos de variables de entorno, no del repositorio); revisar que en la base `usu_password` quede cifrada (empieza con `$2a$`); el JWT no distingue roles todavía (RF009 solo pide inicio de sesión).
  - **Incidente**: tras recargar el proyecto en VS Code apareció `ClassFormatError: Invalid method Code length 0 in class file .../Animal` (clase compilada dañada en `target`). Se resolvió con `.\mvnw.cmd clean compile`. Si se repite, hacer lo mismo.
- **Pruebas con autenticación (2026-10-15)**: `AutenticacionTestSupport` (clase base en `src/test`) hace login real con el administrador que crea `AdminUsuarioInitializer` al arrancar el contexto y devuelve `Bearer <token>`; las tres clases de prueba existentes lo envían en cada petición. 29 de 29 pruebas aprobadas sin tocar `src/main`.
- **Siguiente en código (2026-10-31)**: (1) validar el formato de teléfono, CI y RUC de las personas (Catálogos ya está hecho); (2) luego Salida del animal (con validación del egreso y anulación de animal cargado por error), pantalla de Razas, Inicio con alertas (RF005) y Reportes (RF006 a RF008).
- **Nota técnica de la herramienta**: la sesión de Claude puede leer la carpeta del repo en la PC (`C:\Users\Erick\Documents\GitHub\ef-ganados-sistema`) si se vincula desde la app de escritorio, pero los archivos Java quedan a 8 niveles de profundidad y el límite es 7; hay que conectar la carpeta `...\sistemabovino` directamente o pegar el archivo.
- **Flujo de trabajo adoptado**: para código repetitivo/boilerplate (repositorios, CRUDs simples), se le da a Claude Code una instrucción precisa y cerrada, y se revisa el resultado acá. Para lógica de negocio con reglas específicas del dominio (servicios), se define la lógica exacta acá primero y luego se pide a Claude Code que la implemente tal cual, para evitar que improvise reglas de negocio.

## 11. Checklist de pendientes

- [x] Revisar y corregir las 7 entidades JPA (`Animal`, `Persona`, `Usuario`, `Raza`, `Grupo`, `SubGrupo`, `Pesajes`) — todas commiteadas y pusheadas
- [ ] Actualizar el diagrama ER (dbdiagram.io) y el diagrama de clases quitando `pesoActual`
- [ ] (Opcional, cuando haya tiempo) Agregar comentarios Javadoc retroactivos a `Animal`, `Persona`, `Usuario`, `Raza` (las 4 revisadas antes de adoptar el estándar de comentarios)
- [x] Instalar PostgreSQL, crear la base `efganados`, conectar Spring Boot y confirmar que las 7 tablas se crean correctamente
- [x] Generar y verificar `AnimalService` (GMD, aptitud para venta, registrar pesaje, buscar por ID)
- [x] Generar controladores REST (7 controladores + `GlobalExceptionHandler`), compilando sin errores
- [x] Generar repositorios (Spring Data JPA) — 7 interfaces en `repository/`, verificadas. `UsuarioRepository` con `findByUsuNombre()`
- [x] Reemplazar la `SecurityConfig` temporal por autenticación real con JWT y BCrypt (RF009, RNF006): CP26 a CP29 aprobados
- [x] Actualizar las pruebas automáticas para que se autentiquen con token (29/29 aprobadas; ayudante `AutenticacionTestSupport`, el admin inicial se usa para el login y las credenciales de prueba están en `src/test/resources/application.properties`)
- [ ] Antes de la versión final: cambiar `app.jwt.secret` y `app.admin.password` y no dejarlos en el repositorio
- [ ] Probar los endpoints con Thunder Client (en curso; los casos y resultados se llevan en `CASOS_DE_PRUEBA.md`)
- [x] Resolver el error `Cannot map null into type double` al crear un animal: se aplicó la opción B (`AnimalRequest` con IDs), verificado en CP12
- [x] Caravana única (código + restricción en la base) y validaciones 400/404/409, verificadas en CP13 a CP18
- [x] Borrado de animales con pesajes: bloqueado con 409 (CP19 y CP20)
- [x] Pruebas de borde de GMD y apto-venta (CP21 a CP25)
- [x] Convertir los casos de prueba en pruebas automáticas (JUnit + MockMvc): 22/22 aprobadas
- [ ] Guardar una captura de la ejecución de `.\mvnw.cmd test` como evidencia para el informe
- [ ] Convertir `CASOS_DE_PRUEBA.md` en una tabla LaTeX para el Cap. 4 del informe
- [ ] Antes de la versión final, quitar de `application.properties` las líneas de desarrollo `server.error.include-message=always` y `server.error.include-binding-errors=always` (si se agregaron), y reemplazar la `SecurityConfig` temporal. — antes hay que instalar la extensión Thunder Client en VS Code y cargar algunos datos de prueba (raza, persona, animal) para poder probar `/gmd` y `/apto-venta`
- [x] Generar el proyecto frontend (Vite + React) en `frontend/`
- [x] Pantalla de login en React conectada a `POST /api/auth/login` (modo claro/oscuro, responsiva, probada en PC y celular)
- [x] Centralizar nombre, subtítulo y logo de la empresa (`marca.js`, `public/logo.png`)
- [x] `CLAUDE.md` creado en la raíz del repositorio con las reglas fijas; marca centralizada en `frontend/src/configuracion/marca.js` (el `<title>` de `index.html` queda escrito a mano)
- [x] Endpoint `GET /api/animales/resumen` para el listado (CP30) y ampliado para el detalle del animal (2026-10-27): suma `duenioId`, `duenioNombre`, `razaId`, `subGrupoId`, `aniPesoInicial`, `aniObservacion` y `cantidadPesajes` (38/38 pruebas, CP31)
- [x] Detalle del animal con edición y eliminación (2026-10-27): modal único con vistas detalle/editar/eliminar (`ModalDetalleAnimal.jsx`), `FormularioAnimal` con `modo="editar"` (PUT) y campo Observación, Eliminar deshabilitado si tiene pesajes (aviso visible), confirmación y manejo de 409/404, filtro de lote por `subGrupoId` con etiqueta "Lote — Grupo" y "Sin lote". Probado en PC y celular.
- [ ] Salida del animal (fecha y motivo Venta/Otro, sin pesajes posteriores, filtro de activos/salidos, "Reactivar") junto con la hora de registro (`aniFechaRegistro`)
- [ ] Casos de prueba manuales del detalle (editar, caravana repetida, eliminar con y sin pesajes) en `CASOS_DE_PRUEBA.md` si se quieren como evidencia del informe
- [x] Pantalla de listado de animales en React (RF010): búsqueda, filtros, orden, paginación y opciones de columnas (probada)
- [x] Casilla "Recordarme" en el login (localStorage si está marcada, sessionStorage si no)
- [x] "+ Nuevo animal" (modal de registro, RF001): guarda, valida (fecha no futura, caravana repetida 409) y permite "Guardar y agregar otro" (probado 2026-10-19)
- [x] Ajustes del modal según el prototipo (Figura 6 del informe: "accesos rápidos para la carga de nuevas razas y lotes en caso de no encontrarse disponibles"): botones "+" junto a Raza y Lote con alta rápida dentro del modal; botón "+ Nuevo animal" en verde claro junto al buscador; botón de Opciones solo con el ícono de engranaje
- [x] Backend de Pesajes: sesiones derivadas, registro por lote todo o nada, resumen y detalle, edición y borrado, `/api/auth/yo` (59/59 pruebas, CP32 a CP46)
- [x] Pantalla de Pesajes (RF011): listado de sesiones (buscador, filtro por lote, Intervalo, orden, paginación, columnas), detalle con editar peso, agregar animal, anular pesaje, anular sesión y cambiar fecha, y vista Anulados (probado 2026-10-31)
- [x] Modal "+ Nuevo pesaje" (RF002, RF011): pestañas Por lote / Individual, resumen en vivo, lista acumulada, "Guardar" todo o nada y alta rápida de animal (la **alta rápida** tiene un defecto abierto: ver pendientes nuevos)
- [x] **Backend:** el peso inicial como punto de partida del GMD (regla de la sección 8); pedir `pesoAnteriorEsIngreso` y `fechaPesoAnterior` en el detalle de sesión; adaptar tests, CASOS (CP21 a CP23, CP30, CP35) y CLAUDE.md
- [x] **Frontend:** corregir la alta rápida del modal Nuevo pesaje (al volver deben quedar el lote, la fecha, el animal recién creado elegido y el foco en el peso); causa aún sin encontrar (los tests por pestaña no cubren el flujo completo; pedir un test de integración de `ModalNuevoPesaje`). La devolución del foco tras "Guardar y agregar otro" ya fue corregida por Claude Code el 2026-10-31 (verificar en pantalla)
- [x] **Frontend:** código de sesión (ahora `S-AAMMDD-N`, primera columna) como columna, en la tarjeta, en el encabezado del detalle y buscable; etiqueta "ingreso" junto al peso anterior; texto del GMD promedio "con peso previo (incluye el peso de ingreso)"
- [x] Defecto "Individual no deja guardar un pesaje retroactivo": no se pudo reproducir (dos tests de regresión agregados); verificado en pantalla el 2026-11-06
- [x] Limpieza menor del IDE: 3 advertencias "Null type safety" eliminadas (lambdas en lugar de referencias a método)
- [ ] Pulido: el aviso de "peso menor" de la zona de carga en "Por lote" y el indicador +/- de `ValorDiferenciaPeso` no consideran el caso retroactivo (comparan contra el peso actual)
- [x] Historial de pesajes en el detalle del animal, selector de Responsable y botón "+" de lote en Nuevo pesaje (2026-11-06/07, probado)
- [x] **Catálogos, Razas y Grupos y lotes** (pedido del usuario: no había dónde editar el peso objetivo de una raza ni renombrar o borrar lotes y grupos): hechas y probadas el 2026-11-10. Falta **Personas** (crear empleados que luego se eligen como responsables), dentro de la sección Catálogos del menú
- [x] Pantalla de Personas (Catálogos): alta, edición y borrado seguro (409 si es dueña de animales, responsable de pesajes o tiene usuario de acceso), con filtro por tipo — hecha el 2026-11-11
- [ ] Validar el formato de teléfono (dígitos, espacios y `+ - ( )`, hasta 20 caracteres, al menos 6 dígitos), CI y RUC (letras, números, puntos, guiones y espacios, hasta 20) en backend y frontend; orden entregada el 2026-11-11
- [ ] Tipo de persona **CLIENTE** (para anotar al comprador): agregarlo junto con Salida del animal, cuando haya dónde usarlo; agregarlo antes haría que los clientes aparezcan en el selector de Responsable, así que ese selector se filtrará al mismo tiempo
- [ ] Mejora: crear a un propietario con un "+" directamente desde el formulario de animal (como ya se hace con razas y lotes)
- [ ] Administración > Usuarios: crear usuarios de acceso eligiendo la persona (relación uno a uno ya existente) y, más adelante, permisos por rol (RF009 hoy solo pide iniciar sesión); un módulo de vendedores queda fuera del alcance de la tesis
- [ ] Gráfico de evolución del peso por animal (RF007), en el módulo de Reportes
- [ ] Mejora: atajo "Ver sesión" dentro del aviso de animal que ya tiene pesaje activo ese día
- [ ] Pulido: el panel de columnas (`PanelOpciones.css`) usa z-index 44/45, por encima de los modales (`Modal.css` usa 40); bajarlo como se hizo en `Intervalo`
- [ ] Salida del animal: validar `aniFechaEgreso` (no anterior al ingreso ni al último pesaje activo) y permitir **anular un animal** cargado por error (mismo patrón de estado que los pesajes)
- [ ] Buscar una caravana dentro de las sesiones ("¿en qué sesión pesé TEST-05?"): requiere un endpoint nuevo
- [ ] Tramo de idioma español / portugués (pt-BR) con selector (ver sección 8), cuando Razas e Inicio estén terminados
- [ ] Actualizar `scripts/cargar_animales_prueba.ps1` para crear sesiones con 2 o más animales en la misma fecha y lote
- [ ] Antes del despliegue: subir `app.seguridad.clave-minima` a 8 o más, cambiar `app.jwt.secret` y la clave del administrador
- [ ] Trabajo futuro (tesis): entidad Sesión con numeración y estado "finalizada"; anulación de animales; devolución no aplica al dominio
- [ ] (Pulido final) Ancho de columnas redimensionable en el listado
- [ ] (Pulido) Filtro de lote por ID (agregar `subGrupoId` al resumen) y decidir qué hacer con los animales con fecha de egreso
- [ ] Sección "Configuración" (catálogos de razas con peso objetivo, grupos y lotes; usuarios; datos de la empresa; preferencias)
- [ ] Borrar los animales TEST-xx de la base cuando ya no hagan falta
- [ ] Acordar el modo de dar las pruebas de Thunder Client: siempre método + URL completa + Auth + cuerpo (pedido del usuario)
- [x] Rediseño visual con la paleta de marca (sesión 1, 2026-10-19): tokens de color, Inter, íconos de lucide-react, `estilos/base.css`, barra lateral, tarjetas, tablas, botones y login; contrastes verificados con script WCAG
- [x] Ajuste del login: tarjeta centrada sobre la ilustración dentro de un marco crema
- [ ] Pantalla de Inicio con resumen y alertas de animales aptos (sesión 2 del rediseño; cubre el módulo de Alertas, RF005)
- [x] Clave de desarrollo del admin cambiada a `admin` desde Mi cuenta (2026-10-31). Falta actualizar `scripts/cargar_animales_prueba.ps1` (trae la clave vieja `cambiar-esta-clave`) y los CASOS. Solo para desarrollo: antes de instalar para el cliente real, poner una clave fuerte.
- [x] Pantalla "Mi cuenta" (`/cuenta`) con cambio de clave (`PUT /api/auth/clave`), probada 2026-10-31
- [ ] Menú lateral con secciones desplegables: Principal (Inicio, Animales, Pesajes, Reportes) y **Catálogos** (Razas, Grupos y lotes y Personas, hechos); pendiente la sección Administración (Usuarios, Empresa, Mi cuenta)
- [x] Pantalla de Razas (crear, editar y borrar con peso objetivo de venta; descripción única; peso > 0 y <= 2000; aviso "afecta a N animales"; borrar con animales devuelve 409) — hecha el 2026-11-10
- [ ] Hora de registro: campo automático `aniFechaRegistro` (LocalDateTime, lo completa el servidor) en Animal, mostrado en el detalle; evaluar lo mismo para pesajes más el usuario que registró. La fecha de ingreso sigue siendo solo fecha.
- [ ] (Mejora futura, después de pesajes y reportes) Datos de la empresa editables desde el sistema: entidad `Empresa` de una sola fila (`emp_nombre`, `emp_ruc`, `emp_direccion`, `emp_telefono`, `emp_correo`, `emp_logo`), `GET /api/empresa` público (el login necesita nombre y logo antes de autenticarse), `PUT` protegido y subida del logo con validación de tipo y tamaño. Requiere actualizar el diagrama ER. Mientras tanto, la identidad vive solo en `frontend/src/configuracion/marca.js`.
- [ ] Construir en draw.io (estilo real): modal Nuevo pesaje, detalle de sesión de pesaje
- [ ] Diseñar el módulo de Reportes completo (RF006, RF007, RF008)
- [ ] Insertar mockups de Pesajes en Overleaf
- [ ] Escribir Cap. 4 (Resultados) y Cap. 5 (Conclusión) del informe
- [ ] Aclarar situación de coautoría en el informe final
- [ ] (Opcional) Agregar cita ISO 9241-11 / Nielsen al marco teórico
- [ ] Gestionar formalmente la prórroga de entrega (objetivo: abril/mayo)

## 12. Cómo continuar esto en otro chat

Si abrís una conversación nueva conmigo (Claude) para seguir con este proyecto:

1. Subí este archivo (`CONTEXTO_PROYECTO.md`) al inicio del chat.
2. Decime en qué parte del checklist (sección 11) querés retomar.
3. Si es sobre código, puede ser útil pegar también el archivo `.java` o el error puntual con el que estás trabajando.

Recomendación: actualizá este archivo cada vez que cierres una sesión de trabajo
importante (nuevo mockup terminado, nueva entidad revisada, capítulo del informe
cerrado) y subilo a GitHub junto con el resto del código — así queda como
historial vivo del proyecto, no solo como una foto de este momento.
