<#
  cargar_animales_prueba.ps1
  Carga 25 animales de prueba (caravanas TEST-01 a TEST-25) usando la API del backend,
  para poder probar la paginacion, los filtros y el orden del listado.

  - Usa los endpoints reales (login, razas, subgrupos, animales y pesajes), asi que respeta
    las mismas validaciones que el sistema.
  - Se puede ejecutar varias veces: si una caravana ya existe, la salta.
  - Requiere el backend corriendo y las personas 1 (duenio) y 2 (responsable) cargadas.

  Uso (desde la raiz del repositorio):
    powershell -ExecutionPolicy Bypass -File .\scripts\cargar_animales_prueba.ps1
#>
param(
    [string]$Url = "http://localhost:8080",
    [string]$Usuario = "admin",
    [string]$Clave = "cambiar-esta-clave"
)

$ErrorActionPreference = "Stop"
$cultura = [System.Globalization.CultureInfo]::InvariantCulture

# Envia una peticion JSON a la API. Devuelve la respuesta ya convertida a objeto.
function Invocar {
    param([string]$Metodo, [string]$Ruta, $Cuerpo = $null, [string]$Token = $null)
    $encabezados = @{}
    if ($Token) { $encabezados["Authorization"] = "Bearer $Token" }
    $parametros = @{
        Method  = $Metodo
        Uri     = "$Url$Ruta"
        Headers = $encabezados
    }
    if ($null -ne $Cuerpo) {
        $json = $Cuerpo | ConvertTo-Json -Depth 5
        $parametros["Body"] = [System.Text.Encoding]::UTF8.GetBytes($json)
        $parametros["ContentType"] = "application/json; charset=utf-8"
    }
    return Invoke-RestMethod @parametros
}

# Devuelve el codigo HTTP de un error de Invoke-RestMethod (0 si no hubo respuesta).
function CodigoHttp($errorCapturado) {
    if ($errorCapturado.Exception.Response) {
        return [int]$errorCapturado.Exception.Response.StatusCode
    }
    return 0
}

Write-Host "Iniciando sesion como '$Usuario'..."
try {
    $login = Invocar -Metodo POST -Ruta "/api/auth/login" -Cuerpo @{ usuNombre = $Usuario; usuPassword = $Clave }
} catch {
    Write-Host "No se pudo iniciar sesion. Revisa que el backend este corriendo y las credenciales." -ForegroundColor Red
    throw
}
$token = $login.token

# --- Razas: Brahman (id 1, objetivo 450 kg) y Nelore (objetivo 480 kg) ---
$idBrahman = 1
$razas = Invocar -Metodo GET -Ruta "/api/razas" -Token $token
$nelore = $razas | Where-Object { $_.rzDescripcion -eq "Nelore" } | Select-Object -First 1
if (-not $nelore) {
    $nelore = Invocar -Metodo POST -Ruta "/api/razas" -Token $token -Cuerpo @{ rzDescripcion = "Nelore"; rzPesoObjetivoVenta = 480 }
    Write-Host "Raza 'Nelore' creada."
}
$idNelore = $nelore.rzId

# --- Lotes: Lote A (id 1) y Lote B ---
$idLoteA = 1
$idLoteB = $idLoteA
$subgrupos = Invocar -Metodo GET -Ruta "/api/subgrupos" -Token $token
$loteB = $subgrupos | Where-Object { $_.sbDescripcion -eq "Lote B" } | Select-Object -First 1
if (-not $loteB) {
    try {
        $loteB = Invocar -Metodo POST -Ruta "/api/subgrupos" -Token $token -Cuerpo @{ sbDescripcion = "Lote B"; grupo = @{ grpId = 1 } }
        Write-Host "Lote 'Lote B' creado."
    } catch {
        Write-Host "No se pudo crear 'Lote B' (se usara solo el Lote A)." -ForegroundColor Yellow
    }
}
if ($loteB) { $idLoteB = $loteB.sbId }

# --- Animales y pesajes ---
$creados = 0
$saltados = 0
$pesajesCreados = 0

for ($i = 1; $i -le 25; $i++) {
    $caravana = "TEST-{0:D2}" -f $i
    $idRaza = if ($i % 2 -eq 0) { $idNelore } else { $idBrahman }
    $idLote = if ($i % 3 -eq 0) { $idLoteB } else { $idLoteA }
    $fechaIngreso = (Get-Date "2026-07-01").AddDays($i)
    $pesoInicial = 180 + (($i * 7) % 60)

    $animal = @{
        duenioId        = 1
        razaId          = $idRaza
        subGrupoId      = $idLote
        aniCaravana     = $caravana
        aniFechaIngreso = $fechaIngreso.ToString("yyyy-MM-dd", $cultura)
        aniPesoInicial  = $pesoInicial
        aniObservacion  = "Animal de prueba para el listado"
    }

    try {
        $respuesta = Invocar -Metodo POST -Ruta "/api/animales" -Token $token -Cuerpo $animal
        $creados++
    } catch {
        if ((CodigoHttp $_) -eq 409) { $saltados++; continue }
        throw
    }

    # Cantidad de pesajes segun el numero: 0, 1, 2 o 3 (cada 25 dias desde el ingreso)
    $cantidad = $i % 4
    for ($k = 1; $k -le $cantidad; $k++) {
        $peso = $pesoInicial + $k * (25 + ($i % 3) * 8)
        # Cada 7 animales, el ultimo pesaje supera el objetivo de Brahman (450) pero no el de Nelore (480)
        if (($i % 7 -eq 0) -and ($k -eq $cantidad)) { $peso = 470 }
        $pesaje = @{
            peso          = $peso
            fecha         = $fechaIngreso.AddDays(25 * $k).ToString("yyyy-MM-dd", $cultura)
            responsableId = 2
        }
        Invocar -Metodo POST -Ruta "/api/animales/$($respuesta.aniId)/pesajes" -Token $token -Cuerpo $pesaje | Out-Null
        $pesajesCreados++
    }
}

Write-Host ""
Write-Host "Listo: $creados animales creados, $saltados ya existian, $pesajesCreados pesajes registrados." -ForegroundColor Green
