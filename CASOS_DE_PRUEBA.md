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

Todos los casos de borde previstos de la API ya fueron probados (CP01 a CP25). Queda:

- Capturas de pantalla de CP19, CP21 y CP22 (no se sacaron; repetir solo si hacen falta para el informe, o reemplazar por las pruebas automáticas).

**Nota (autenticación):** desde CP26 la API exige un token JWT en todos los endpoints salvo el login. Los casos CP01 a CP25 se hicieron antes, cuando la seguridad estaba abierta; las pruebas automáticas deben actualizarse para autenticarse (ver abajo).

## Pruebas automáticas (JUnit + MockMvc)

Los casos de la API también se ejecutan de forma automática. Usan una base H2 en memoria
(`jdbc:h2:mem:testdb`), por lo que nunca tocan la base PostgreSQL `efganados`. Cada prueba corre
en su propia transacción, que se revierte al terminar.

**Cómo ejecutarlas:** desde la carpeta `backend`, con `.\mvnw.cmd test` (en PowerShell hace falta el `.\` delante).

**Primera ejecución (2026-10-13): 21 de 21 pruebas aprobadas, 0 fallos, 0 errores.**

**Tras agregar la prueba del valor límite: 22 de 22 aprobadas.**

| Clase (`src/test/java/.../controller`) | Pruebas | Casos manuales que cubre |
|---|---|---|
| `AnimalControllerTest` | 9 | CP12 a CP17, CP19, CP20, listado (CP10) |
| `PesajeControllerTest` | 3 | CP18 y registro de pesajes (201 y 404) |
| `IndicadoresControllerTest` | 9 | CP08, CP09, CP11, CP21 a CP25, y valor límite (peso igual al objetivo) |
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
