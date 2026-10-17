# QA — WorkLog Pro 3.1

## Archivos y estructura

- [ ] `index.html` existe en la raíz.
- [ ] `css/styles.css` y `css/mobile.css` cargan sin 404.
- [ ] Todos los módulos dentro de `js/` cargan sin 404.
- [ ] Los iconos 192 y 512 existen.
- [ ] `manifest.webmanifest` es válido.
- [ ] `service-worker.js` registra correctamente.

## Escritorio

- [ ] A más de 1024 px aparece el sidebar y el diseño de escritorio original.
- [ ] Inicio, Jornada, Lugares, Historial, Calendario, Reportes y Ajustes funcionan.
- [ ] No aparece la navegación inferior móvil.

## Tablet / móvil

- [ ] A 1024 px o menos aparece cabecera WorkLog Pro, estado de guardado, avatar y navegación inferior.
- [ ] No existe scroll horizontal en 360, 390, 430, 768 y 1024 px.
- [ ] Los botones permanecen dentro de sus tarjetas.
- [ ] Inicio muestra fecha, resumen de jornada, acceso instantáneo, plantillas e itinerario.
- [ ] Jornada usa tarjetas táctiles y botones Concluir/Editar.
- [ ] Historial usa tarjetas agrupadas por fecha, no la tabla de escritorio.
- [ ] Reportes usa tarjetas 2x2 y rankings apilados.
- [ ] Ajustes usa tarjetas y controles táctiles sin desbordes.
- [ ] Lugares y Calendario siguen siendo utilizables con una mano.

## Registro

- [ ] El botón central Registrar abre el formulario.
- [ ] En móvil el formulario aparece como bottom sheet.
- [ ] `+ Nuevo lugar` crea el lugar y vuelve al registro con ese lugar seleccionado.
- [ ] `+ Nueva` crea el tipo y vuelve al registro con el tipo seleccionado.
- [ ] `Más opciones` despliega prioridad, fecha límite, nota y etiquetas en teléfono.
- [ ] `Guardar y registrar otra` conserva el contexto necesario.
- [ ] Editar no crea un duplicado.
- [ ] Repetir crea un registro nuevo.

## Historial y exportación

- [ ] Búsqueda y filtros funcionan.
- [ ] CSV exporta los registros filtrados.
- [ ] Excel exporta un `.xlsx` válido.
- [ ] Excel incluye Actividades, Lugares, Resumen, Por lugar y Por actividad.
- [ ] JSON completo puede exportarse e importarse.

## Offline / PWA

- [ ] WorkLog abre con caché en un dispositivo de confianza después de una primera carga online.
- [ ] Los cambios pendientes muestran estado de sincronización.
- [ ] El Service Worker incluye `mobile.css` y `excel.js`.
- [ ] `/admin` no se sirve desde la caché de la app pública.

## Seguridad

- [ ] Las reglas de Firestore están publicadas en Firebase.
- [ ] Un usuario solo puede acceder a sus propios datos.
- [ ] Una cuenta bloqueada no puede seguir leyendo/escribiendo al reconectar.
- [ ] El panel admin requiere documento autorizado en `/admins/{uid}`.

## Auditoría V2.7 — responsive móvil/tablet

- Corregido conflicto heredado de `.mobile-only` que limitaba contenedores móviles a 42×42 px.
- Estado `Guardado` vuelve a mostrar texto en móvil.
- Historial móvil conserva monto/estado en la zona derecha y acciones dentro de la tarjeta.
- Ajustes móvil vuelve a usar filas compactas con controles alineados, salvo Apariencia que usa controles de ancho completo.
- Probado visualmente en Chromium a 320, 360, 390, 430, 768 y 1024 px.
- Probado modal de registro en los mismos anchos.
- No se detectaron desbordes no intencionales en las páginas principales; los chips horizontales de filtros usan desplazamiento horizontal por diseño.
- Panel admin comprobado a 320, 390, 768 y 1024 px con `styles.css` cargado.


## V3.0 — revisión visual y responsive

- [ ] PC 1366x768, 1440x900 y 1920x1080: sidebar, topbar y grids sin desbordes.
- [ ] Tablet 768x1024, 820x1180 y 1024x1366: experiencia táctil en 1–2 columnas.
- [ ] Móvil 320, 360, 390, 412 y 430 px: ningún botón sale del encuadre.
- [ ] Header móvil muestra sección, sincronización y avatar.
- [ ] Barra inferior respeta safe-area y no tapa contenido.
- [ ] Registrar actividad abre bottom sheet en touch y modal en PC.
- [ ] Historial usa cards en móvil y tabla amplia en PC.
- [ ] Calendario y Reportes mantienen controles dentro del viewport.
- [ ] Ajustes, Lugares y Jornada no pierden acciones existentes.
- [ ] Excel, CSV, JSON, Auth, Firestore y PWA siguen funcionando.


## V3.1 — pruebas nuevas

- [ ] Login: la pantalla de carga avanza por estados y la app aparece solo al terminar.
- [ ] Cuenta nueva: queda pendiente y muestra el mensaje de aprobación; el admin la activa y entra.
- [ ] Offline < 24 h tras entrar online: abre. Offline > 24 h o sin verificación previa: no abre.
- [ ] Móvil: barra Hoy · Calendario · ＋ · Historial · Más; Más abre el bottom sheet.
- [ ] Calendario: seleccionar día y "Registrar actividad para este día".
- [ ] Modal Registrar: footer sólido al hacer scroll.
- [ ] PIN: 5 fallos bloquean temporalmente; PIN antiguo (SHA-256) se migra al desbloquear.
- [ ] CSV exportado: celdas que empiezan con = + - @ llevan apóstrofo.
- [ ] CSP (Report-Only): login, Firestore y /admin sin violaciones en consola antes de activarla.
- [ ] Tab dentro de un modal no sale del modal.
