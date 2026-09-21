# 📚 Instrucciones de la Biblioteca Athenaeum

¡Bienvenido a tu biblioteca personal! Aquí tienes la guía rápida para importar tus libros en formato Word (`.docx`) y EPUB (`.epub`) para que se sumen automáticamente a tu colección.

## 1. Importar libros desde Word (.docx)

### Formato del archivo
Asegúrate de que la primera hoja de tu Word tenga la "metadata" (los datos del libro) escritos de la siguiente manera:

```text
Título: El Nombre del Libro
Autor: Tu Nombre
Año: 2026
Sinopsis: Una breve descripción de lo que trata la historia...
```

**Para los capítulos:**
Para que el sistema sepa dónde cortar cada capítulo, asegúrate de utilizar el estilo **"Título 1"** de Word para los nombres de tus capítulos, o simplemente escribe un `#` antes del nombre (ej: `# Capítulo 1`).

### Comando para importar
Abre una terminal en esta misma carpeta y ejecuta:

```bash
npm run import -- /ruta/completa/a/tu/libro.docx
```
*(Puedes arrastrar el archivo desde tu explorador de archivos hacia la terminal para que se copie la ruta automáticamente).*

---

## 2. Importar libros desde EPUB (.epub)

Los archivos EPUB ya contienen toda la metadata y la división de capítulos internamente, ¡así que es mucho más automático! No necesitas preparar el archivo previamente.

### Comando para importar
Simplemente ejecuta:

```bash
npm run import:epub -- /ruta/completa/a/tu/libro.epub
```

El script leerá el título, el autor y la estructura del libro, y generará todo por ti en cuestión de segundos.

---

## ¿Qué pasa después de importar?

1. El sistema creará una nueva carpeta dentro de `src/content/books/` con el nombre de tu libro.
2. Allí adentro verás un archivo `book.md` (con los datos) y una carpeta `capitulos/` con cada parte de tu historia.
3. Para ver cómo quedó, simplemente inicia tu servidor local con:

```bash
npm run dev
```

Y entra a [http://localhost:4321](http://localhost:4321). ¡Tu nuevo libro ya estará en el estante listo para leer en pantalla completa y con efecto flipbook!
