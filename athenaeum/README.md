# Athenaeum — Biblioteca Digital de Autor

Sitio estático para publicar tus libros escritos con lector inmersivo de
efecto hoja (flipbook 3D). Los lectores acceden gratis desde cualquier
navegador; su progreso, marcadores y notas se guardan únicamente en su
propio dispositivo (localStorage).

## Panel de Administración

Desde `/admin` podés gestionar tus escritos de forma visual:

- **Ver estadísticas** de tu biblioteca (total de libros, capítulos, palabras)
- **Publicar o marcar como borrador** cualquier escrito con un solo clic
- **Reordenar** los escritos en la estantería (subir/bajar)
- **Agregar nuevos escritos** rellenando un formulario simple (título, autor, género)
- **Buscar y filtrar** por género

### Para importar archivos Word o EPUB

```bash
npm run import -- /ruta/a/tu/libro.docx
npm run import:epub -- /ruta/a/tu/libro.epub
```

Las instrucciones detalladas están en `INSTRUCCIONES_BIBLIOTECA.md`.

## Comandos

| Comando             | Acción                                          |
| ------------------- | ----------------------------------------------- |
| `npm install`       | Instalar dependencias                           |
| `npm run dev`       | Servidor de desarrollo en `localhost:4321`      |
| `npm run build`     | Generar el sitio estático en `dist/`            |
| `npm run preview`   | Previsualizar el build de producción            |
| `npm run check`     | Verificación de tipos (TypeScript + Astro)      |
| `npm run import`    | Importar libro desde Word (.docx)               |
| `npm run import:epub`| Importar libro desde EPUB (.epub)              |

## Cómo publicar un libro nuevo

Cada libro es una carpeta dentro de `src/content/books/`. Estructura:

```
src/content/books/mi-nuevo-libro/
├── book.md                    # Metadatos del libro
└── capitulos/
    ├── 01-primer-capitulo.md
    ├── 02-segundo-capitulo.md
    └── ...
```

### 1. `book.md` — metadatos (frontmatter)

```yaml
---
title: Mi Nuevo Libro
subtitle: Relatos breves
author: Tu Nombre
genre: Relatos                 # alimenta los filtros de la estantería
tags: [Sur realista, Inédito]
year: 2026
signature: 'ATHENAEUM ARCHIVAL · SIGNATURA 850-C'
status: published              # "draft" lo excluye del sitio
coverPalette: olive            # terracotta | olive | burgundy | ivory
prologueQuote: >-
  Frase del prólogo que se muestra en la ficha editorial.
prologueAttribution: '— T. N., Cuaderno de Invierno'
synopsis: >-
  Resumen de la obra para la ficha y los buscadores.
order: 2                       # posición en la estantería
---
```

El cuerpo del archivo puede quedar vacío (los capítulos van aparte).

### 2. Capítulos

Un archivo Markdown por capítulo:

```markdown
---
number: 1
title: El Primer Capítulo
location: Buenos Aires
---

Texto del capítulo. Se admiten **negritas**, *cursivas*, citas con `>`
que se maquetan como notas al margen, y listas.
```

Los capítulos se ordenan por `number` automáticamente.

### 3. Convertir Word a Markdown (pandoc)

```bash
sudo apt install pandoc
pandoc mi-capitulo.docx -t gfm --wrap=none -o 01-mi-capitulo.md
```

Agregá después el frontmatter (`number`, `title`, `location`) al inicio
del archivo generado.

## Despliegue gratuito

### Vercel (recomendado)

1. Subí el proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com), importá el repositorio.
3. Framework detectado automáticamente: **Astro**. Sin variables de entorno.
4. Cada `git push` publica automáticamente.

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`

> Antes de publicar, actualizá `site` en `astro.config.mjs` con tu dominio
> real (se usa para el canonical, Open Graph y el sitemap).

## Seguridad

Diseño con superficie de ataque mínima:

- **100% estático**: sin servidor, base de datos, cuentas ni API. Nada que
  vulnerar del lado servidor.
- **CSP restrictiva** en todas las páginas (`default-src 'self'`; sin CDNs,
  fuentes ni imágenes externas).
- **Contenido de autor** renderizado en tiempo de build (SSG).
- **Datos del lector** (notas, progreso): input de usuario renderizado
  exclusivamente con `textContent` (nunca `innerHTML`), validado por
  esquema al leerlo de localStorage, con longitudes acotadas.
- **JSON inyectado** con `<` escapado a `\u003c` (anti `</script>` breakout).
- Sin hotlinks a terceros: fuentes e iconos self-hosted vía Fontsource.

## Estructura

```
src/
├── components/        # UI: portadas, tarjetas, logo, navegación
├── content/books/     # TUS LIBROS (Markdown + capítulos)
├── data/quotes.json   # Pensamiento del día
├── layouts/           # Layout base (SEO, CSP, fuentes)
├── lib/
│   ├── admin/         # Panel de administración
│   │   ├── types.ts   # Tipos de datos del admin
│   │   └── admin-app.ts # Lógica cliente del admin
│   ├── books.ts       # Acceso a la colección (solo publicados)
│   ├── reader/        # Motor de lectura
│   │   ├── paginator.ts   # Divide capítulos en páginas reales
│   │   ├── flipbook.ts    # Volteo 3D / deslizamiento / desvanecido
│   │   ├── audio.ts       # Sonido de papel (Web Audio, sin assets)
│   │   ├── storage.ts     # localStorage validado por esquema
│   │   ├── settings.ts    # Preferencias de lectura
│   │   └── reader-app.ts  # Controlador del lector
│   ├── shelf/ notebook/ lectura/ settings/   # Apps por pantalla
├── pages/             # Rutas: /, /libro/[slug], /leer/[slug], /cuaderno, /ajustes, /admin
└── scripts/           # Import: import-book.mjs, import-epub.mjs
```
