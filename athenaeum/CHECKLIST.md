# ✅ Checklist de Solución de Errores (CSP, CORS, Ngrok, Fonts)

## A) CSP correcta (por HEADER HTTP)
- [x] Eliminada la etiqueta `<meta http-equiv="Content-Security-Policy">` del archivo `src/layouts/BaseLayout.astro`.
- [x] Creado un script `scripts/generate-vercel-config.mjs` que corre en la fase de `build`.
- [x] El script genera el archivo `vercel.json` con los headers HTTP correctos para todas las rutas (`/(.*)`).
- [x] La directiva `frame-ancestors 'none'` y el resto de configuraciones estrictas (incluyendo default-src, script-src, style-src, img-src, etc.) se inyectan correctamente como cabeceras reales.
- [x] Agregados cabezales extra de seguridad en `vercel.json`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [x] La regla de CSP lee la variable de entorno `VITE_BACKEND_URL` al generarse, evitando dominios hardcodeados.

## B) Fuente base64
- [x] Extraída la fuente en base64 de Plus Jakarta Sans que causaba el bloqueo.
- [x] Guardada como un archivo real `.woff2` en `/public/fonts/mi-fuente.woff2`.
- [x] Inyectada usando `@font-face` en `src/styles/global.css`.
- [x] Eliminada la importación directa desde `@fontsource-variable/plus-jakarta-sans` en el layout que causaba que Astro la incrustara en base64.
- [x] Agregada etiqueta `<link rel="preload">` en el `<head>` para cargar la fuente óptimamente.

## C) Nextcloud / Portadas estáticas (Sin dependencia de Ngrok)
- [x] Eliminada la dependencia obligatoria de ngrok y URLs remotas.
- [x] Creado script `scripts/sync-nextcloud-covers.mjs` que copia automáticamente las portadas de `~/Nextcloud/Athenaeum/portadas/` a `public/portadas/`.
- [x] Agregado comando `npm run sync:covers` e integrado en `npm run build`.
- [x] `BookCard.astro` y `[slug].astro` ahora soportan rutas relativas locales si `VITE_BACKEND_URL` está vacío.
- [x] `BookCover.astro` ya no inyecta cabeceras de ngrok (`ngrok-skip-browser-warning`).
- [x] En `.env` la variable `VITE_BACKEND_URL` ahora queda vacía por defecto para servir portadas locales/estáticas desde `/portadas/`.

ℹ️ **SINCRONIZACIÓN DE PORTADAS:**
Cada vez que agregues o modifiques portadas en tu carpeta de Nextcloud (`~/Nextcloud/Athenaeum/portadas/`), puedes ejecutar `npm run sync:covers` (o directamente `npm run build`) para sincronizarlas al proyecto.

## D) HTTPS / contenido mixto
- [x] El frontend (Vercel) siempre fuerza HTTPS por defecto.
- [x] Todas las peticiones `fetch` e imágenes usan el dominio especificado en `VITE_BACKEND_URL`, que debe comenzar con `https://`.

## E) Auditoría de secretos
- [x] `.gitignore` configurado correctamente para ignorar `.env`.
- [x] No se expusieron secretos privados en el frontend (las peticiones a Ngrok no llevan claves hardcodeadas).

## F) CORS en el backend
- [x] El servidor backend actual (Caddy) está configurado con `Access-Control-Allow-Origin: *`.
- [x] El problema real de CORS de hace un rato era causado por el "Choque con Nextcloud" en el puerto 8080 de tu PC, lo cual ya arreglamos cambiando Caddy al puerto 8082 en tu máquina de respaldo.

---
### 🛠️ Comandos de Verificación
1. Para construir y probar que se genera el `vercel.json` correctamente:
   ```bash
   npm run build
   ```
2. Para comprobar los headers localmente (cuando la subas a Vercel):
   ```bash
   curl -I https://athenaeum-indol.vercel.app/
   ```
3. Revisa la consola del navegador; el error `(index):5 The Content Security Policy directive...` ya no existirá porque la CSP ahora viene por Headers de red HTTP, y la fuente cargará sin problemas.
