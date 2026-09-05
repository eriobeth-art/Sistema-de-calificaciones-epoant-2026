# GitHub Pages · calificaciones.edupsic.com

Sube **el contenido de esta carpeta** a la raíz del repositorio que usarás para el sistema.

Archivos principales:
- `index.html`: interfaz completa.
- `config.js`: URL del backend Apps Script y versión.
- `bridge-client.js`: comunicación segura con Apps Script sin exponer credenciales.
- `CNAME`: fija `calificaciones.edupsic.com`.
- `.nojekyll`: sirve los archivos estáticos sin procesamiento de Jekyll.
- `robots.txt`: evita indexación del sistema.

En GitHub activa **Settings → Pages → Deploy from a branch → main / root**.

Luego, en DNS de `edupsic.com`, crea un CNAME para `calificaciones` apuntando al host de GitHub Pages de tu cuenta (`TU-USUARIO.github.io`).

No cambies `config.js` salvo que cambie la URL `/exec` de Apps Script. Si editas una implementación existente y eliges **Nueva versión**, normalmente la URL se conserva.
