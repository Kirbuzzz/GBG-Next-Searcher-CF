# Buscador de niveles de GBG en Nextendo (versión Cloudflare Workers)
Idea de Kirbus

## Archivos
- wrangler.jsonc : configuración (nombre del proyecto, carpeta de la página, KV)
- worker/index.js : la API (listar, añadir y borrar niveles)
- public/index.html : la página
- public/_headers : cabeceras de seguridad
- seed.json : los 11 niveles iniciales

## Subir a GitHub
Sube TODO el contenido de esta carpeta a un repositorio nuevo, respetando las carpetas
(wrangler.jsonc y seed.json en la raíz; worker/ y public/ como carpetas).

## Conectar con Cloudflare
1. dash.cloudflare.com > Workers & Pages > Create > importar repositorio de Git.
2. Project name: gbg-next-searcher (debe coincidir con "name" en wrangler.jsonc;
   si usas otro nombre, edita wrangler.jsonc).
3. Build command: vacío. Deploy command: npx wrangler deploy. Pulsa Deploy.
4. El almacenamiento KV (LEVELS) se crea solo al desplegar.

## Clave de administrador (para borrar niveles)
Proyecto > Settings > Variables and Secrets > Add:
tipo Secret, nombre ADMIN_KEY, valor una clave larga (solo letras y números).
Abre la página con: https://TU-ENLACE.workers.dev/#admin=TU_CLAVE
Aparece una × roja en cada nivel.

## Límites del plan gratis (KV)
1.000 escrituras al día: cada nivel añadido gasta 2 y cada borrado 1.
Máximo 5 niveles por persona cada 10 minutos.
