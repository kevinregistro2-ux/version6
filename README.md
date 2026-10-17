# WorkLog Pro 3.1

WorkLog Pro es una PWA local-first para registrar actividades de trabajo, jornada, lugares frecuentes, historial, calendario y reportes.

## Interfaz

- Escritorio (>1024 px): conserva el layout de escritorio con barra lateral y paneles amplios.
- Tablet y móvil (<=1024 px): usa una interfaz táctil dedicada inspirada en una app nativa, con cabecera compacta, navegación inferior, tarjetas, historial agrupado y formularios tipo bottom sheet.
- Teléfonos (<=760 px): una columna, controles grandes, formularios progresivos y protección contra desbordes horizontales.

## Funciones principales

- Firebase Authentication por correo y contraseña.
- Firestore con datos separados por usuario.
- Caché local de Firestore en dispositivos de confianza.
- Registro rápido y registro detallado.
- Creación de lugar o tipo de actividad desde el propio formulario de registro.
- Guardar y registrar otra actividad.
- Jornada diaria y pendientes.
- Historial con filtros y búsqueda.
- Calendario y reportes.
- Exportación CSV, JSON y Excel `.xlsx` sin librerías externas.
- PIN local.
- Panel administrativo independiente en `/admin`.
- PWA y Service Worker.

## Estructura

```text
.
├── index.html
├── admin.html
├── css/
│   ├── styles.css
│   └── mobile.css
├── js/
│   ├── access.js
│   ├── admin.js
│   ├── app.js
│   ├── auth.js
│   ├── constants.js
│   ├── data.js
│   ├── excel.js
│   ├── firebase-config.js
│   ├── firebase.js
│   └── ui.js
├── firebase/
│   └── firestore.rules
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── manifest.webmanifest
├── service-worker.js
├── firebase.json
├── _redirects
└── _headers
```

## Importante al desplegar

La web puede publicarse en Netlify. Las reglas de Firestore no se publican al subir el ZIP a Netlify: deben mantenerse publicadas en Firebase.

El Service Worker usa la caché `worklog-pro-3.1.1-r1`, por lo que esta versión invalida la caché anterior.

## WorkLog Pro V3.0 — interfaz unificada

La interfaz V3 combina el diseño de escritorio de las referencias web con la experiencia táctil de SnapLayout móvil, conservando la lógica existente de Firebase, Firestore, PWA, trabajo local-first, Excel, lugares, historial, calendario, reportes y seguridad. El archivo `css/worklog-pro-v3.css` se carga al final para aplicar el nuevo sistema visual sin duplicar la lógica de datos.


## WorkLog Pro 3.1 — cambios

- Pantalla de carga real (estados de arranque; la app no se muestra hasta tener datos).
- Navegación: Jornada deja de ser destino; Hoy = día actual, Calendario = cualquier otro día, Historial = búsqueda. Móvil: Hoy · Calendario · ＋ · Historial · Más (bottom sheet).
- Footer Cancelar/Guardar del modal con fondo sólido.
- Acceso offline con lease de 24 h desde la última verificación online.
- Cuentas nuevas quedan **pendientes** hasta que el administrador las active (regla de Firestore: autocreación solo con `active == false`). Las cuentas antiguas sin documento `userAccess` también quedarán pendientes: actívalas desde /admin.
- Contraseña mínima de 10 caracteres al crear/cambiar; mensajes de login neutros.
- Dispositivo de confianza desactivado por defecto.
- PIN local con PBKDF2 (210.000 iteraciones, salt) y bloqueo por intentos. El PIN es un bloqueo de interfaz, no cifrado.
- Cabeceras de seguridad en Netlify y Firebase Hosting. La CSP está en modo **Report-Only** (solo reporta en consola, no bloquea). Cuando la consola no muestre violaciones, cambia `Content-Security-Policy-Report-Only` por `Content-Security-Policy` en `_headers` y `firebase.json`.
- CSV neutraliza fórmulas; la importación limita el tamaño de archivo; las fechas se validan contra el calendario.
- Accesibilidad: roles de diálogo, focus trap y etiquetas en filtros.
