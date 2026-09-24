# Sistema de Gestión Bovina — EF Ganados

Documento de contexto del proyecto. Sirve como referencia para el equipo y como
"memoria" para retomar el trabajo (con Claude Code, en otro chat, o con cualquier
colaborador nuevo).

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
| Login | ✅ Terminado | Usuario, contraseña, mensaje de error |
| Animales — Listado | ✅ Terminado (estilo real en draw.io) | Caravana, Raza, Lote, Peso actual, Estado (badge "Apto para venta") |
| Animales — Modal Nuevo animal | ✅ Terminado (estilo real) | Caravana, Raza (+ "nuevo"), Lote (+ "nuevo"), Fecha ingreso, Peso inicial |
| Pesajes — Listado | ✅ Terminado (estilo real en draw.io) | Fecha, Lote, Cantidad, Promedio, Mínimo, Máximo — una fila por sesión |
| Pesajes — Detalle de sesión | ⏳ Decidido, no construido | Vista de solo lectura al hacer clic en una fila |
| Pesajes — Modal Nuevo pesaje | ⏳ Diseñado, falta construir en estilo real | Tabs "Por lote" / "Individual"; en "Por lote": selector Lote+Fecha, resumen en vivo (arriba), fila para agregar animal (selector + peso + botón "+ Agregar"), lista acumulada con opción de eliminar antes de guardar |
| Reportes | ❌ No iniciado | RF006 (comparativo por lote), RF007 (gráfico evolución), RF008 (exportar PDF) |
| Vista mobile | ❌ No iniciado | Solo mencionado como nota en el texto (responsive) |

## 8. Decisiones de diseño importantes (y por qué)

- El **peso objetivo de venta** vive en `Raza` (no en Animal ni SubGrupo), porque el rango ideal varía según la raza.
- El **registro de pesaje** no persiste nada hasta tocar "Guardar" — permite cancelar sin dejar datos a medias.
- Cada pesaje es un **registro nuevo**, nunca se sobrescribe uno viejo — necesario para poder calcular la GMD comparando pesajes.
- Se descartaron (movidos a "futuras investigaciones", **no forman parte del alcance actual**): módulo de salud/farmacia, identificación por chip/RFID, calendario por colores.
- RF010 y RF011 se agregaron durante el proceso de diseño (no estaban en el anteproyecto original) — están documentados como evolución natural de RF001/RF002, no como expansión de alcance.
- **Corrección del tutor**: `Animal` no guarda `pesoActual` como campo propio — se calcula siempre a partir de `Pesajes` (el pesaje más reciente), evitando duplicar y desincronizar datos. Aplica a `Animal.java`, al diagrama ER, al diagrama de clases, y a la lógica de `calcularGMD()`/`estaAptoParaVenta()`.
- **Convención de nombres en las entidades JPA**: todo atributo escalar propio de la tabla lleva el prefijo de la entidad (ej. `ani_...` en Animal, `per_...` en Persona). Las relaciones (`@ManyToOne`/`@OneToOne`, ej. `duenio`, `raza`, `subGrupo`) **no** llevan prefijo, porque no son columnas propias sino referencias a otra entidad.
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

## 10. Estado del desarrollo (código)

- **Entorno instalado** (PC principal): JDK 25 (compatible con proyecto configurado en Java 21), Node.js LTS, Git, VS Code + "Extension Pack for Java" + extensión oficial **Claude Code** (`anthropic.claude-code`)
- **Repositorio**: GitHub privado `ef-ganados-sistema`, con carpeta `backend/` (proyecto Spring Boot: dependencias Web, Data JPA, PostgreSQL Driver, Security, Lombok)
- **PostgreSQL**: aún no instalado
- **Frontend (Vite + React)**: aún no generado
- **Entidades JPA**: las 7 clases revisadas y corregidas, todo commiteado y pusheado a GitHub:
  - `Animal`: sin `pesoActual` (corrección del tutor aplicada).
  - `Persona`: prefijo `per_` en todos los atributos escalares.
  - `Usuario`: `unique = true` en `per_id` (FK a Persona) y en `usuNombre`.
  - `Raza`: `rzDescripcion` única y `nullable = false`; `rzPesoObjetivoVenta` `nullable = false`.
  - `Grupo`: `grpDescripcion` `nullable = false`. Javadoc/comentarios agregados (primera clase con el nuevo estándar de comentarios).
  - `SubGrupo`: `sbDescripcion` `nullable = false`, con comentarios.
  - `Pesajes`: `pesaFecha` y `pesaPeso` `nullable = false`; columna FK de responsable renombrada a `per_id_responsable` (para diferenciarla claramente de `Animal.per_id`, que es el dueño); con comentarios.
- **Siguiente en código**: repositorios (Spring Data JPA) → servicios (`calcularGMD()`, `estaAptoParaVenta()`) → controladores → luego frontend.

## 11. Checklist de pendientes

- [x] Revisar y corregir las 7 entidades JPA (`Animal`, `Persona`, `Usuario`, `Raza`, `Grupo`, `SubGrupo`, `Pesajes`) — todas commiteadas y pusheadas
- [ ] Actualizar el diagrama ER (dbdiagram.io) y el diagrama de clases quitando `pesoActual`
- [ ] (Opcional, cuando haya tiempo) Agregar comentarios Javadoc retroactivos a `Animal`, `Persona`, `Usuario`, `Raza` (las 4 revisadas antes de adoptar el estándar de comentarios)
- [ ] Instalar PostgreSQL y crear la base `efganados` ⏳ en curso
- [ ] Generar repositorios y servicios
- [ ] Generar el proyecto frontend (Vite + React)
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
