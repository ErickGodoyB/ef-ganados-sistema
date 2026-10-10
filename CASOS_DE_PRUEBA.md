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

- GMD con exactamente 1 pesaje (debe devolver vacío) y los códigos de estado del `POST` de cada pesaje (201).
- GMD con los dos pesajes más recientes en la misma fecha (debe dar 0.0).
- Aptitud para venta por encima del peso objetivo (cargar un pesaje de 460 kg o más: debe dar `true`).
- Que el GMD use solo los dos pesajes más recientes cuando hay más de dos.
- 404 limpio para un animal inexistente (`GET /api/animales/999/gmd`).
- Verificar en PostgreSQL que exista la restricción UNIQUE sobre `animal.ani_caravana`
  (la validación del controlador ya la cubre, pero la base debe ser la última defensa).
- Borrar un animal que tiene pesajes (hoy daría 500 por la clave foránea; decidir la regla).
