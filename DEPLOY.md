# Despliegue de WorkLog Pro 3.1

## Netlify

1. Publica la carpeta raíz del proyecto, la que contiene `index.html`.
2. No se necesita comando de build.
3. El archivo `_redirects` envía `/admin` a `admin.html` y mantiene el fallback de la PWA.
4. `_headers` evita que `index.html` y `service-worker.js` queden obsoletos en caché y marca el panel administrativo como no indexable.

## Firebase Authentication

En Firebase Console > Authentication > Settings > Authorized domains, confirma que el dominio de producción de Netlify esté autorizado.

## Firestore

Las reglas están en `firebase/firestore.rules`. Si cambiaste de proyecto o las reglas todavía no están publicadas, publícalas desde Firebase Console o Firebase CLI.

## Actualización desde una versión anterior

Esta versión cambia la caché del Service Worker a `worklog-pro-3.1.1-r1`. Normalmente el navegador actualizará solo. Si un dispositivo conserva una versión antigua, cierra todas las pestañas de WorkLog y vuelve a abrir la web; como último recurso, limpia los datos del sitio una sola vez.

## Comprobación rápida

- `/` abre WorkLog.
- `/admin` abre el panel administrativo.
- En PC se muestra el diseño de escritorio.
- En 1024 px o menos se activa la interfaz móvil/tablet.
- Registrar abre un bottom sheet en móvil.
- Excel genera un `.xlsx` localmente.
