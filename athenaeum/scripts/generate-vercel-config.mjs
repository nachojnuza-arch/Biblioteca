import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const backendUrl = process.env.VITE_BACKEND_URL || 'https://smudgy-relic-criteria.ngrok-free.dev';

const vercelConfig = {
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: ${backendUrl}; connect-src 'self' blob: ws://localhost:* http://localhost:* ${backendUrl}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
};

await fs.writeFile('vercel.json', JSON.stringify(vercelConfig, null, 2));
console.log(`✅ vercel.json generado con el backend: ${backendUrl}`);
