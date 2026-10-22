import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEST_DIR = path.join(__dirname, '../public/portadas');

// Posibles ubicaciones de carpetas en Nextcloud
const HOME = os.homedir();
const NEXTCLOUD_SOURCES = [
  path.join(HOME, 'Nextcloud/Athenaeum/portadas'),
  path.join(HOME, 'Nextcloud/portadas')
];

function normalizeSlug(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function syncCovers() {
  await fs.mkdir(DEST_DIR, { recursive: true });

  let foundSource = false;
  let copiedCount = 0;

  for (const srcDir of NEXTCLOUD_SOURCES) {
    try {
      const stats = await fs.stat(srcDir);
      if (stats.isDirectory()) {
        foundSource = true;
        const files = await fs.readdir(srcDir);
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            const srcPath = path.join(srcDir, file);
            const destPath = path.join(DEST_DIR, file);
            await fs.copyFile(srcPath, destPath);
            await fs.chmod(destPath, 0o644).catch(() => {});
            copiedCount++;

            // También generar versión sin acentos si difiere
            const normalizedName = normalizeSlug(path.basename(file, ext)) + ext;
            if (normalizedName !== file.toLowerCase()) {
              const normDestPath = path.join(DEST_DIR, normalizedName);
              await fs.copyFile(srcPath, normDestPath);
              await fs.chmod(normDestPath, 0o644).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      // Directorio no accesible o no existe (ej. en Vercel)
    }
  }

  if (foundSource) {
    console.log(`🖼️  Sincronización con Nextcloud: ${copiedCount} portada(s) sincronizadas en public/portadas/`);
  } else {
    console.log(`ℹ️  No se detectó carpeta local de Nextcloud (ejecución remota/build estándar). Usando portadas existentes en public/portadas/`);
  }
}

syncCovers().catch((err) => {
  console.error('Error sincronizando portadas desde Nextcloud:', err);
});
