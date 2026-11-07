# Casos de prueba de la API — EF Ganados

Pruebas funcionales manuales con Thunder Client contra el backend local
(`http://localhost:8080`). Datos de prueba ficticios.

## Datos de prueba cargados

| Recurso | ID | Datos |
|---|---|---|
| Raza | 1 | Brahman, peso objetivo de venta 450 kg |
| Persona | 1 | Juan Pérez, PROPIETARIO |
| Persona | 2 | Carlos Gómez, EMPLEADO |
| Grupo | 1 | Ingreso Octubre 2026 |
| SubGrupo | 1 | Lote A (grupo 1) |
| Animal | 1 | Caravana AR-001, ingreso 2026-08-01, peso inicial 210 kg (dueño 1, raza 1, subgrupo 1) |

## Casos

| Caso | Petición | Entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP01 | `GET /api/razas` (sin datos) | — | 200 OK, lista vacía | 200 OK, `[]`, 350 ms | Aprobado |
| CP02 | `POST /api/razas` | Brahman, 450 | 201 Created con `rzId` | 201, `rzId` 1 | Aprobado |
| CP03 | `POST /api/personas` | Juan (PROPIETARIO) y Carlos (EMPLEADO) | 201 Created | 201, `perId` 1 y 2 | Aprobado |
| CP04 | `POST /api/grupos` | "Ingreso Octubre 2026" | 201 Created | 201, `grpId` 1 | Aprobado |
| CP05 | `POST /api/subgrupos` | "Lote A", grupo 1 | 201 Created | 201, `sbId` 1 | Aprobado |
| CP06 | `POST /api/animales` con `"raza": {"rzId": 1}` | Solo ID en la raza | 201 Created | 400 Bad Request: `Cannot map null into type double` | Falla (hallazgo, resuelto con CP12) |
| CP07 | `POST /api/animales` con la raza completa | Raza con descripción y peso objetivo | 201 Created | 201, `aniId` 1 | Aprobado |
| CP08 | `GET /api/animales/1/gmd` (0 pesajes) | — | 200 OK, cuerpo vacío (GMD nulo) | 200, 0 bytes, 434 ms | Aprobado |
| CP09 | `GET /api/animales/1/apto-venta` (0 pesajes) | — | `false` (210 kg < 450 kg) | 200, `false`, 15 ms | Aprobado |
| CP10 | `GET /api/animales` | — | 200 OK con la lista de animales | 200, 637 bytes, 41 ms, animal con dueño, raza y subgrupo | Aprobado |
| CP11 | `GET /api/animales/1/gmd` con 2 pesajes (215 kg el 2026-08-15 y 245 kg el 2026-09-14, 30 días) | — | 1.0 kg/día, es decir (245 − 215) / 30 | 1.0 | Aprobado |
| CP12 | `POST /api/animales` con IDs (`duenioId`, `razaId`, `subGrupoId`) | `AR-002`, ingreso 2026-08-10, peso inicial 200 | 201 Created, relaciones completas | 201, `aniId` 2, 545 bytes, 342 ms, dueño, raza y subgrupo completos | Aprobado |
| CP13 | `PUT /api/animales/2` con IDs y `aniObservacion` nueva | "Prueba de actualización" | 200 OK con la observación actualizada | 200, 657 bytes, 39 ms, observación actualizada | Aprobado |
| CP14 | `POST /api/animales` sin `razaId` | Cuerpo sin `razaId` | 400 con el mensaje del campo faltante | 400, `Falta el campo razaId` | Aprobado |
| CP15 | `POST /api/animales` con `razaId: 999` | Raza inexistente | 404 con mensaje | 404, `Raza no encontrada con id: 999` | Aprobado |
| CP16 | `POST /api/animales` con caravana repetida | `AR-001` (ya existe) | 409 Conflict con mensaje | 409, `Ya existe un animal con la caravana: AR-001` | Aprobado |
| CP17 | `POST /api/animales` con caravana vacía | `"aniCaravana": ""` | 400 con mensaje | 400, `Falta el campo aniCaravana` | Aprobado |
| CP18 | `POST /api/animales/1/pesajes` sin `responsableId` | Solo `peso` y `fecha` | 400 con mensaje | 400, mensaje de falta de responsable | Aprobado |
| CP19 | `DELETE /api/animales/3` (animal descartable AR-900, sin pesajes) | — | 204 No Content | 204, vacío, 56 ms; la consola muestra el `delete from animal` (sin captura) | Aprobado |
| CP20 | `DELETE /api/animales/1` (animal con pesajes) | — | 409 con mensaje | 409, `No se puede eliminar el animal: tiene pesajes registrados`; el animal 1 sigue existiendo (`GET` 200) | Aprobado |
| CP21 | `POST /api/animales/4/pesajes` (210 kg, 2026-09-01) y luego `GET /api/animales/4/gmd` (animal AR-901, 1 solo pesaje) | — | Pesaje 201; GMD 200 con cuerpo vacío | Pesaje 201, 30 ms; GMD 200, vacío (sin captura) | Aprobado |
| CP22 | `POST /api/animales/4/pesajes` (215 kg, misma fecha 2026-09-01) y luego `GET /api/animales/4/gmd` | — | Pesaje 201; GMD 200 con `0.0` (0 días entre los pesajes) | Pesaje 201; GMD 200, `0.0` (sin captura) | Aprobado |
| CP23 | Animal AR-902 (`aniId` 5) con 3 pesajes (200 kg el 2026-08-01, 230 kg el 2026-09-01, 290 kg el 2026-10-01); `GET /api/animales/5/gmd` | — | 2.0, es decir (290 − 230) / 30, usando solo los 2 más recientes | Los 3 `POST` dieron 201; GMD 200, `2.0`, 14 ms | Aprobado |
| CP24 | `POST` de un pesaje de 460 kg (2026-10-10) al animal 5 y `GET /api/animales/5/apto-venta` | 460 ≥ 450 (Brahman) | 201 y luego `true` | 201; `apto-venta` 200, `true`, 14 ms | Aprobado |
| CP25 | `GET /api/animales/999/gmd` (animal inexistente) | — | 404 con mensaje | 404, `Animal no encontrado con id: 999` | Aprobado |
| CP26 | `POST /api/auth/login` con `admin` y la contraseña de desarrollo | Credenciales correctas | 200 con `token`, `usuNombre` y `tipo` | 200 con token, `usuNombre` y `tipo` (`EMPLEADO`) | Aprobado |
| CP27 | `POST /api/auth/login` con contraseña incorrecta | `clave-equivocada` | 401 con mensaje genérico | 401, `Usuario o contraseña incorrectos` | Aprobado |
| CP28 | `GET /api/animales` sin token | — | 401 | 401 | Aprobado |
| CP29 | `GET /api/animales` con el token del CP26 (Auth → Bearer) | Token válido | 200 con la lista | 200, 2.15 KB, 85 ms | Aprobado |
| CP30 | `GET /api/animales/resumen` con token (listado para la pantalla de animales, RF010) | Datos de prueba: AR-001, AR-002, AR-901, AR-902 | 200 con una fila por animal: raza, lote, grupo, `pesoActual`, `gmd`, `aptoVenta` | 200. AR-001: 245.0, GMD 1.0, no apto. AR-002: 200.0 (peso inicial), GMD `null`, no apto. AR-901: 210.0, GMD 0.0, no apto. AR-902: 460.0, GMD 18.888…, apto | Aprobado |
| CP31 | `GET /api/animales/resumen` con token, campos ampliados para el detalle del animal | AR-001 (2 pesajes) | 200 con `duenioId`, `duenioNombre`, `razaId`, `subGrupoId`, `aniPesoInicial`, `aniObservacion` y `cantidadPesajes`, sin cambiar los campos anteriores | 200. AR-001: dueño 1 "Juan Pérez", raza 1, lote 1, peso inicial 210.0, observación `null`, 2 pesajes; `pesoActual` 245.0, GMD 1.0, no apto | Aprobado |
| CP32 | `GET /api/auth/yo` con token | — | 200 con el usuario autenticado y su persona | 200, `personaId` 3 | Aprobado |
| CP33 | `POST /api/pesajes/sesion` con 2 animales (AR-001 260 kg, AR-002 235 kg) el 2026-10-20 | `responsableId` 3 | 201 con 2 pesajes | 201, `pesaId` 46 y 47 | Aprobado |
| CP34 | `GET /api/pesajes/sesiones` | — | Fila del 2026-10-20, Lote A: cantidad 2, total 495, promedio 247.5, mínimo 235, máximo 260 | Coincide exactamente | Aprobado |
| CP35 | `GET /api/pesajes/sesiones/detalle?fecha=2026-10-20&subGrupoId=1` | — | AR-001: peso anterior 245, GMD ≈ 0.4167; AR-002: peso anterior y GMD `null` | AR-001: 260.0, anterior 245.0, GMD 0.4166…; AR-002: 235.0, `null`, `null` | Aprobado |
| CP36 | `POST /api/pesajes/sesion` con un ítem de peso 0 (todo o nada) | Animal 1 válido + animal 2 con peso 0, fecha 2026-10-21 | 400 y no se guarda ninguno | 400 `El peso debe ser mayor a 0 y hasta 2000 kg`; no existe ninguna sesión del 2026-10-21 | Aprobado |
| CP37 | `POST /api/pesajes/sesion` con fecha futura | 2030-01-01 | 400 | 400 `La fecha del pesaje no puede ser futura` | Aprobado |
| CP38 | `POST /api/pesajes/sesion` con fecha anterior al ingreso | AR-001, 2026-07-01 | 400 | 400 `La fecha del pesaje no puede ser anterior al ingreso del animal (AR-001: 2026-08-01)` | Aprobado |
| CP39 | `POST /api/pesajes/sesion` con un animal repetido | Animal 1 dos veces | 400 | 400 `El animal AR-001 está repetido en la sesión` | Aprobado |
| CP40 | `POST /api/pesajes/sesion` sin ítems | `items: []` | 400 | 400 `La sesión debe tener al menos un pesaje` | Aprobado |
| CP41 | `POST /api/pesajes/sesion` con peso exagerado | 2500 kg | 400 | 400 `El peso debe ser mayor a 0 y hasta 2000 kg` | Aprobado |
| CP42 | `PUT /api/pesajes/46` con peso 262 y observación | `{"peso":262,"observaciones":"Corregido"}` | 200; el GMD de AR-001 se recalcula (≈ 0.4722) | 200; el detalle refleja el cambio | Aprobado |
| CP43 | `PUT /api/pesajes/99999` | Id inexistente | 404 | 404 `Pesaje no encontrado con id: 99999` | Aprobado |
| CP44 | `DELETE /api/pesajes/46` | — | 204 | 204, vacío | Aprobado (histórico: el endpoint se eliminó el 2026-10-30) |
| CP45 | `DELETE /api/pesajes/47` | — | 204 | 204, vacío (datos de AR-001 y AR-002 restaurados) | Aprobado (histórico) |
| CP46 | `DELETE /api/pesajes/47` por segunda vez | — | 404 | 404 `Pesaje no encontrado con id: 47` | Aprobado (histórico) |

Nota sobre CP30: en AR-901 los dos pesajes tienen la misma fecha, así que cuál es "el más reciente" es arbitrario (devolvió 210.0); no afecta el uso real.

**Cambios posteriores que afectan a estos casos (2026-10-30/31):**
- CP44 a CP46: el `DELETE` físico de pesajes se **eliminó**; lo reemplaza la anulación lógica (`PUT /api/pesajes/{id}/anular`), cubierta por pruebas automáticas.
- CP21 a CP23, CP30 y CP35 (GMD): las expectativas de "GMD `null` con un solo pesaje" (y otros valores calculados con la regla vieja) quedaron **desactualizadas** desde el 2026-11-05, cuando el peso inicial pasó a ser el punto de partida del GMD (ver `CONTEXTO_PROYECTO.md`, sección 8). Son resultados históricos; las pruebas automáticas ya validan la regla nueva. Si se necesitan como evidencia del informe, hay que repetirlas en Thunder Client.
- CP33, CP36 y similares: ahora existe además la regla de **un pesaje activo por animal por día** (409).

## Casos nuevos cubiertos solo por pruebas automáticas (no probados en Thunder Client)

| Endpoint | Qué se verifica |
|---|---|
| `PUT /api/pesajes/{id}/anular` | 200 con estado anulado; motivo obligatorio (3 a 255 caracteres, 400); doble anulación 409; id inexistente 404 |
| `PUT /api/pesajes/sesion/anular` | Anula todos los pesajes activos de la sesión (todo o nada); 404 si no existe o no tiene activos |
| `GET /api/pesajes/anulados` | Lista con motivo, fecha y quién anuló; filtro por fechas |
| `PUT /api/pesajes/sesion/fecha` | Mueve la sesión; rechaza fecha futura, igual a la actual, anterior al ingreso (400) y animal con pesaje activo en la nueva fecha (409); 404 si la sesión no existe |
| `PUT /api/pesajes/{id}` sobre un pesaje anulado | 409 |
| `POST /api/pesajes/sesion` y `POST /api/animales/{id}/pesajes` | 409 `El animal <caravana> ya tiene un pesaje activo el dd/MM/yyyy...`; fecha anterior al ingreso 400 (verificado) |
| Consultas de peso actual, GMD, resumen, listados | Los pesajes anulados no cuentan |
| `GET /api/animales/{id}/pesajes` | Historial ordenado por fecha con peso anterior y GMD (misma lógica que el detalle de sesión); `incluirAnulados` lista los anulados sin que cuenten como anterior; 404 si el animal no existe |
| `PUT /api/auth/clave` | 204 con datos correctos; clave actual incorrecta 400 (no 401); clave igual a la actual o demasiado corta 400 |
| `POST` y `PUT /api/animales` | 400 si `aniFechaIngreso` es posterior al primer pesaje activo; los anulados no cuentan; animal sin pesajes sin restricción |

## Pruebas manuales de la interfaz — Pesajes (2026-10-29 a 2026-10-31)

Hechas por el autor en PC (y celular Android) con los datos `TEST-xx`.

| N.º | Prueba | Resultado |
|---|---|---|
| UI-01 | Nuevo pesaje "Por lote" (Lote B, fecha de hoy, varios animales) y guardar | Aprobado: el listado muestra una sesión con varios animales |
| UI-02 | Volver a cargar un animal ya incluido en la sesión | Aprobado: lo rechaza con el mensaje del servidor / el buscador explica el motivo |
| UI-03 | Anular un pesaje con motivo | Aprobado: desaparece de la sesión y aparece en la vista Anulados |
| UI-04 | Anular una sesión completa con varios animales | Aprobado: aparece en Anulados con el motivo |
| UI-05 | Cambiar la fecha de la sesión a una fecha libre / a una fecha con conflicto | Aprobado: con fecha libre mueve la sesión; con conflicto muestra el mensaje 409 |
| UI-06 | Filtro Intervalo (atajos y rango manual) | Aprobado tras corrección: el campo "Hasta" se salía del panel y el panel no se cerraba al abrir un modal ni al hacer clic afuera |
| UI-07 | Buscadores: ícono de lupa sobre el texto de ejemplo | Aprobado tras corrección (la clase de padding estaba en el elemento equivocado) |
| UI-08 | Mi cuenta: clave actual incorrecta | Aprobado: muestra el error y no cierra la sesión |
| UI-09 | Mi cuenta: cambio real de clave (`admin`) e ingreso con la nueva | Aprobado |
| UI-10 | Pestaña Individual: "Guardar y agregar otro" | Aprobado tras corrección (2026-11-05): limpia animal y peso, conserva la fecha y devuelve el foco al buscador |
| UI-11 | Pestaña Individual: animal que ya tiene pesaje ese día | Aprobado: avisa `El animal AR-001 ya tiene un pesaje activo el 30/10/2026...` y no deja cargar |
| UI-12 | Alta rápida de animal desde el modal (caravana inexistente) | Aprobado tras corrección (2026-11-06): el modal desmontaba la pestaña; ahora vuelve con lote, fecha y animal elegidos, el peso inicial precargado y el foco en "+ Agregar" (probado en Por lote e Individual) |
| UI-13 | Animal con ingreso posterior a la fecha (TEST-25, fecha 2026-07-05) | Aprobado: explica que ingresó el 26/07/2026 y no ofrece registrar animal nuevo |
| UI-14 | Peso menor al último del animal | Aprobado: avisa sin bloquear; diferencia y GMD negativos con ícono y texto |
| UI-15 | GMD promedio en el detalle de una sesión | Aprobado |
| UI-16 | Prueba en celular Android (modal, tarjetas, Intervalo, Mi cuenta) | Aprobado |
| UI-17 | GMD con un solo pesaje (TEST-01, TEST-05, TEST-09) | Aprobado (2026-11-06): ahora muestra ganancia diaria calculada contra el peso y la fecha de ingreso; un animal sin pesajes sigue en "—" |
| UI-18 | Detalle de sesión: primer pesaje de un animal | Aprobado: "Peso anterior" con etiqueta "ingreso" y GMD calculado |
| UI-19 | Código de sesión (`S-AAMMDD-N`): chip en la primera columna y búsqueda parcial | Aprobado |
| UI-20 | Alta de animal con peso inicial el día de hoy y pesaje del mismo peso el mismo día | Aprobado: se crea un pesaje real, diferencia 0,0 kg y GMD "—" (0 días desde el ingreso) |
| UI-21 | Aviso de pesaje retroactivo (fecha anterior al último pesaje del animal) | Aprobado (2026-11-06): con TEST-01 y fecha 10/07/2026 aparece "ya tiene un pesaje posterior (30/10/2026, sesión S-261030-1)...", se guarda y el pesaje posterior recalcula su peso anterior. El bloqueo reportado antes no se pudo reproducir (dos tests de regresión agregados) |
| UI-22 | Historial de pesajes en el detalle del animal (TEST-01) | Aprobado (2026-11-07): fila de ingreso y pesajes del más reciente al más antiguo, con valores coherentes con el detalle de sesión |
| UI-23 | "Ver sesión" desde el historial | Aprobado: lleva a Pesajes con el código escrito en el buscador y el listado filtrado |
| UI-24 | Historial de un animal sin pesajes | Aprobado: muestra "Este animal todavía no tiene pesajes" |
| UI-25 | Selector de Responsable en Nuevo pesaje y su aparición en el detalle de sesión | Aprobado |
| UI-26 | Botón "+" junto a Lote en "Por lote": crear un lote de prueba | Aprobado: queda seleccionado y, con animales cargados, pide la confirmación de cambio de lote |
| UI-27 | Historial del animal en el celular | Aprobado |

**Hallazgo (2026-10-31), resuelto el 2026-11-05:** un animal con un solo pesaje no mostraba ganancia diaria porque el peso inicial no se consideraba punto de partida. Ahora el peso inicial a la fecha de ingreso es el punto de partida del GMD (UI-17 y UI-18).

Nota sobre CP13: el primer intento dio 405 (Method Not Allowed) porque la petición salió como POST
en lugar de PUT (error del probador, no del sistema). Repetida con PUT, devolvió 200.

### Hallazgo de CP06 (resuelto)
`Raza.rzPesoObjetivoVenta` es un `double` primitivo. Al mandar la raza solo con su ID, Jackson no
encuentra ese valor y falla. Solución aplicada (opción B): `AnimalController` recibe un objeto de
petición `AnimalRequest` con solo IDs y el servidor busca las entidades. Verificado en CP12.

### Observación de CP07
La respuesta del POST devuelve los objetos relacionados tal como se enviaron (por ejemplo, el
dueño con sus campos en `null`); no es lo que está guardado en la base, solo el eco de la entrada.
El `INSERT` de Hibernate en la consola confirma que se guardaron las claves foráneas
(`per_id`, `rz_id`, `sb_id`).

### Observación de CP10
La lista se serializó sin errores, pero en los objetos relacionados aparece un campo extra
`"hibernateLazyInitializer": {}`. Es un residuo de las relaciones `LAZY` de Hibernate: inofensivo,
pero ensucia la respuesta. Se puede limpiar más adelante (por ejemplo con objetos de respuesta
propios). Además, la consola muestra una consulta adicional por cada relación de cada animal;
con 100 a 150 cabezas no es un problema, pero conviene tenerlo presente para el RNF003.

## Pendientes de probar

Todos los casos de borde previstos de la API ya fueron probados en Thunder Client (CP01 a CP25 y CP30 a CP46; los endpoints posteriores están cubiertos por pruebas automáticas). Queda:

- Capturas de pantalla de CP19, CP21 y CP22 (no se sacaron; repetir solo si hacen falta para el informe, o reemplazar por las pruebas automáticas).

**Nota (autenticación):** desde CP26 la API exige un token JWT en todos los endpoints salvo el login. Los casos CP01 a CP25 se hicieron antes, cuando la seguridad estaba abierta; las pruebas automáticas deben actualizarse para autenticarse (ya actualizadas, ver abajo).

## Pruebas automáticas (JUnit + MockMvc)

Los casos de la API también se ejecutan de forma automática. Usan una base H2 en memoria
(`jdbc:h2:mem:testdb`), por lo que nunca tocan la base PostgreSQL `efganados`. Cada prueba corre
en su propia transacción, que se revierte al terminar.

**Cómo ejecutarlas:** desde la carpeta `backend`, con `.\mvnw.cmd test` (en PowerShell hace falta el `.\` delante).

**Primera ejecución (2026-10-13): 21 de 21 pruebas aprobadas, 0 fallos, 0 errores.**

**Tras agregar la prueba del valor límite: 22 de 22 aprobadas.**

**Tras agregar la autenticación (2026-10-15): 29 de 29 aprobadas, 0 fallos, 0 errores.** Las pruebas de animales, pesajes e indicadores ahora inician sesión con el administrador y envían el encabezado `Authorization: Bearer <token>`.

**Tras agregar el endpoint `/resumen` (2026-10-18): 35 de 35 aprobadas, 0 fallos, 0 errores.** Las 6 pruebas nuevas cubren: sin token (401), animal sin pesajes (peso inicial, GMD nula, no apto), dos pesajes (peso más reciente y GMD correcta), peso exactamente igual al objetivo (apto), peso por encima del objetivo (apto) y animal sin subgrupo (descripciones en `null`, sin error).

**Tras ampliar el resumen del animal (2026-10-27): 38 de 38 aprobadas, 0 fallos, 0 errores.** Las 3 pruebas nuevas cubren: `cantidadPesajes` en 0 y en 2, los campos nuevos correctos (dueño, raza, lote, peso inicial, observación) y `subGrupoId` en `null` cuando no hay lote.

**Tras las sesiones de pesaje (2026-10-28): 59 de 59 aprobadas, 0 fallos, 0 errores** (38 anteriores + 21 nuevas). Cubren: reglas de peso, fecha (futura, anterior al ingreso) y salida del animal; sesión todo o nada; animal repetido y sesión vacía; resumen de sesiones agrupado por fecha y lote (incluido "sin lote"); detalle con peso anterior y GMD; edición y borrado de pesajes; y `/api/auth/yo`. La prueba de atomicidad vive en su propia clase sin `@Transactional`, porque con la transacción de la prueba el "deshacer" no sería visible dentro del mismo método (en producción el rollback es inmediato).

**Tras la anulación, el cambio de fecha y la clave (2026-10-30): 92 de 92 aprobadas.** **Tras validar la fecha de ingreso contra el primer pesaje activo (2026-10-31): 96 de 96 aprobadas.** **Tras el GMD desde el ingreso (2026-11-05): 99 de 99.** **Tras agregar `fechaUltimoPesaje` al resumen (2026-11-06): 100 de 100.** **Tras el historial de pesajes por animal (2026-11-07): 105 de 105 aprobadas**.

**Pruebas del frontend (Vitest): 135 el 2026-10-30, 146 el 2026-11-05, 163 el 2026-11-06 y 171 de 171 aprobadas el 2026-11-07** con `npm test` desde `frontend` (la API se simula, no se llama al servidor real). Cubren funciones puras, `ValorGmd`, `ValorDiferenciaPeso`, `BuscadorAnimal`, `Intervalo` y las pestañas del modal Nuevo pesaje.

La tabla siguiente refleja el reparto de las primeras 59 pruebas, salvo `AnimalControllerTest` (23 tras las nuevas) y la clase `PesajeAnulacionYFechaSesionControllerTest` (14, nueva). Las demás clases cambiaron de cantidad al adaptar los tests del `DELETE` y agregar los de anulación y clave; el desglose exacto se obtiene con `.\mvnw.cmd test`.

| Clase (`src/test/java/.../controller`) | Pruebas | Casos manuales que cubre |
|---|---|---|
| `AnimalControllerTest` | 23 | CP12 a CP17, CP19, CP20, listado (CP10), resumen (CP30) y resumen ampliado (CP31) |
| `PesajeControllerTest` | 3 | CP18 y registro de pesajes (201 y 404) |
| `IndicadoresControllerTest` | 9 | CP08, CP09, CP11, CP21 a CP25, y valor límite (peso igual al objetivo) |
| `AuthControllerTest` | 9 | CP26 a CP29 y validaciones: login correcto (200), contraseña incorrecta (401), falta `usuNombre` (400), falta `usuPassword` (400), endpoint protegido sin token (401) y con token (200), y que `usuPassword` no aparezca en la respuesta de usuarios |
| `PesajeSesionControllerTest` | 18 | CP33 a CP46 (sesión, errores, resumen, detalle, edición y borrado) |
| `PesajeSesionAtomicidadTest` | 1 | CP36 (todo o nada, sin `@Transactional`) |
| `PesajeAnulacionYFechaSesionControllerTest` | 14 | Anular sesión, cambio de fecha de sesión y listado de anulados (sin caso manual) |
| `HistorialPesajesControllerTest` | 5 | `GET /api/animales/{id}/pesajes`: valores y orden, primer pesaje contra el ingreso, animal sin pesajes, animal inexistente (404), anulados excluidos o incluidos sin afectar al anterior (sin caso manual) |
| `SistemaBovinoApplicationTests` | 1 | Carga del contexto de Spring |

Las pruebas manuales (CP01 a CP25) quedan como evidencia de la verificación con una herramienta
externa; las automáticas permiten repetirlas con un solo comando después de cada cambio.

### Verificación de la sensibilidad de las pruebas (mutación manual)

Para comprobar que las pruebas detectan errores reales, se cambió a propósito `>=` por `>` en
`AnimalService.estaAptoParaVenta`. Con las 21 pruebas iniciales **todas seguían pasando**, porque
ninguna probaba el valor exacto del límite (peso igual al objetivo de la raza). Se agregó la prueba
`aptoVentaConPesoExactamenteIgualAlObjetivoDevuelveTrue` (450 kg contra objetivo 450). Con el cambio
roto, esa prueba falló (`expected:<true> but was:<false>`), y al restaurar `>=` pasaron las 22.
Conclusión: las pruebas de valor límite son necesarias; la prueba nueva cubre el único borde
de la regla de aptitud para venta.
