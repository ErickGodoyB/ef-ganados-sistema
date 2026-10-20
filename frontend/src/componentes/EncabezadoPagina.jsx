/**
 * Encabezado estándar de una página: título, subtítulo opcional y un
 * espacio a la derecha para acciones (ej. "+ Nuevo animal"). Usado por
 * Animales, Pesajes y Reportes para que las tres compartan el mismo
 * encabezado en vez de cada una armar el suyo.
 */

export default function EncabezadoPagina({ titulo, subtitulo, children }) {
  return (
    <div className="encabezado-pagina">
      <div className="encabezado-pagina-titulos">
        <h1>{titulo}</h1>
        {subtitulo && <p className="encabezado-pagina-subtitulo">{subtitulo}</p>}
      </div>
      {children && <div className="encabezado-pagina-acciones">{children}</div>}
    </div>
  )
}
