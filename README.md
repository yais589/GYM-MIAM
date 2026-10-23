# TitanGym

Aplicacion web de entrenamiento con catalogo de ejercicios, seguimiento personal, nutricion y tienda de suplementos.

## Inicio rapido

Requisitos: Node.js 16 o superior y npm.

### Backend

```bash
cd catalogo-ejercicios/backend
npm install
npm run dev
```

El backend se inicia en `http://localhost:5000`.

### Frontend

En otra terminal:

```bash
cd catalogo-ejercicios/frontend
npm install
npm run dev
```

La aplicacion se abre en `http://localhost:3000`.

## Estructura

```text
.
├── catalogo-ejercicios/
│   ├── backend/              API Express y conexion con Firebase
│   └── frontend/             Aplicacion React y estilos
├── JsWger.js                 Importacion de datos nutricionales
├── enrich-exercises.js       Enriquecimiento de ejercicios
└── sync-storeitems.js        Sincronizacion de productos de tienda
```

## Funciones

- Catalogo de ejercicios con categorias, busqueda y dificultad.
- Favoritos y registro de entrenamientos por usuario.
- Estadisticas de minutos, calorias y sesiones.
- Perfil de usuario y autenticacion mediante Firebase.
- Modos espanol e ingles.
- Catalogo nutricional con datos por 100 gramos.
- Tienda conectada a `https://api-titangym.onrender.com/storeitems`.
- Carrito, descuentos por plan y pagos seguros mediante Stripe Checkout.
- Stock visible para usuarios y reservas transaccionales durante el pago.
- Panel admin con inventario, stock, precio, disponibilidad, pedidos e ingresos.
- Paginas legales y aviso de cookies.

## Configuracion

El backend usa `catalogo-ejercicios/backend/.env`. Puedes copiar `.env.example` y completar las variables de Firebase y correo necesarias.

No publiques `firebase-key.json`, `.env` ni ninguna credencial en el repositorio.

### Rol de administrador

Los permisos de administrador se guardan en Firestore en `admins/{uid}` con `enabled: true`, siguiendo el registro de administradores existente en el backend. La primera vez que se autentica el correo configurado en `ADMIN_EMAIL`, el backend crea o habilita su documento. El backend no confía en campos de perfil enviados por el navegador; las reglas de Firestore también deben impedir escrituras directas de clientes en `admins`.

Configura `ADMIN_EMAIL` en las variables de entorno del **backend** y despliega de nuevo ese servicio. En este proyecto Vercel sirve el frontend estático; no necesita esa variable ni credenciales de Firebase Admin. Al iniciar sesión con el correo configurado, el documento `admins/{uid}` aparecerá en Firestore. Las credenciales de Firebase Admin deben permanecer únicamente en el entorno seguro del backend.

La tienda usa por defecto `GET /api/storeitems` para que el stock administrado y el catálogo sean siempre el mismo. Solo define esta variable si necesitas usar temporalmente una fuente externa:

```env
VITE_STORE_API_URL=https://api-titangym.onrender.com/storeitems
```

Si no se define, se utiliza el endpoint del backend (`VITE_API_URL` + `/storeitems`), que comparte la misma colección de Firestore que el panel admin y los pagos.

En Vercel, define `VITE_API_URL` con la URL HTTPS pública del backend Express, incluyendo el sufijo `/api`:

```env
VITE_API_URL=https://tu-backend.onrender.com/api
```

No uses `localhost` en esta variable de Vercel. En desarrollo local, si no se define `VITE_API_URL`, Vite usa el proxy a `http://localhost:5000`. El backend debe permitir solicitudes CORS desde el dominio de Vercel.

### Stripe y pagos

Configura en el backend (`catalogo-ejercicios/backend/.env`) las variables `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `FRONTEND_URL`. El navegador nunca recibe la clave secreta ni procesa datos de tarjeta: el backend valida los productos y precios en Firestore, reserva el stock y crea una sesión alojada de Stripe.

En el Dashboard de Stripe crea un endpoint webhook apuntando a:

```text
https://TU_BACKEND_PUBLICO/api/stripe/webhook
```

Activa los eventos `checkout.session.completed` y `checkout.session.expired`. El primero confirma el pedido y el segundo libera automáticamente el stock reservado. Para probarlo en local puedes usar `stripe listen --forward-to localhost:5000/api/stripe/webhook`.

Para probar un pago en modo test usa la tarjeta `4242 4242 4242 4242`, una fecha futura y cualquier CVC. En producción sustituye `sk_test_...` por la clave live y configura el webhook live.

El panel de administración permite editar stock, precio y disponibilidad desde `Tienda > Control de tienda > Inventario y stock`. Este botón solo se renderiza para cuentas admin, y las rutas siguen protegidas por Firebase Authentication y el rol admin del backend.

### Informes de la IA administrativa

La IA del panel admin entiende periodos en lenguaje natural (`este mes`, `el mes pasado`, `los últimos 7 días`, `en marzo de 2025`, `del 1 al 15 de marzo`) y genera informes de stock, usuarios, ventas y actividad. Cada informe se puede descargar en PDF y se recalcula en el servidor desde su `spec` (tipo + fechas), nunca desde datos enviados por el navegador.

Los movimientos de stock se guardan en la colección `stockMovements` (ajustes manuales, reservas y liberaciones). Firestore solo guarda el stock actual, así que el historial empieza a partir de esta versión; los informes anteriores a ella muestran la última actualización de cada producto. Las reglas de Firestore deben impedir escrituras de clientes en `stockMovements`, igual que en `admins`: solo las escribe el backend con Firebase Admin.

### Configurar administradores

Los permisos de administrador se consultan en Firestore:

```text
admins/{UID_DEL_USUARIO}
```

El correo definido mediante `ADMIN_EMAIL` se crea o habilita automáticamente en esa colección al iniciar sesión. Para añadir a otro administrador manualmente, en Firebase Console:

1. Abre **Firestore Database**.
2. Crea una colección llamada `admins`.
3. Crea un documento cuyo ID sea el **UID exacto** del usuario que quieres hacer administrador.
4. Añade el campo booleano `enabled` con valor `true`.
5. El usuario debe cerrar sesión y volver a entrar para que la interfaz recargue su perfil.

El UID se obtiene en **Authentication > Users**. No uses el email como ID del documento. No crees un formulario público para modificar `admins`; esa colección debe poder editarla únicamente el propietario del proyecto desde Firebase Console o un panel administrativo protegido.

## API principal

- `GET /api/health`
- `GET /api/exercises`
- `GET /api/categories`
- `GET /api/nutrition`
- `GET /api/storeitems`
- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/webhook`
- `GET /api/admin/storeitems`
- `PATCH /api/admin/storeitems/:id`
- `POST /api/admin/ai`
- `POST /api/admin/ai/report-pdf`
- `GET /api/admin/ai/interactions`
- `POST /api/user`
- `GET /api/user/:id`
- `PUT /api/user/:id`
- `GET /api/user/:userId/favorites`
- `POST /api/user/:userId/workout`
- `GET /api/user/:userId/workouts`
- `GET /api/user/:userId/stats`
- `GET /api/profile/cart`
- `PUT /api/profile/cart`

## Scripts de datos

Desde la raiz del proyecto:

```bash
node JsWger.js
node enrich-exercises.js
npm run sync:storeitems
```

El comando `sync:storeitems` descarga los productos de la API y los guarda en la coleccion Firestore `storeitems`. Si se borra esa coleccion, se puede volver a crear ejecutando el mismo comando. Los productos se guardan usando su `id`, por lo que no se duplican al repetir la importacion.

Estos scripts requieren acceso a Firebase y las credenciales configuradas correctamente. Si se elimina el proyecto completo de Firebase, hay que crear un proyecto nuevo y sustituir `firebase-key.json` y las variables de entorno por credenciales nuevas.

## Tecnologias

- React 18 y Vite
- Node.js y Express
- Firebase Authentication, Firestore y Firebase Admin
- Axios y Fetch
- CSS responsive

## Desarrollo

El codigo de la interfaz esta en `catalogo-ejercicios/frontend/src`. Los componentes y sus estilos estan separados por funcionalidad. El servidor esta en `catalogo-ejercicios/backend/server.js`.

Antes de publicar, ejecuta:

```bash
cd catalogo-ejercicios/frontend
npm run build
```

## Publicar el frontend en Vercel

El repositorio incluye `vercel.json` en la raiz porque la aplicacion Vite esta dentro de `catalogo-ejercicios/frontend`.

En Vercel, importa el repositorio sin cambiar la raiz del proyecto. La configuracion ejecuta automaticamente:

```bash
npm --prefix catalogo-ejercicios/frontend install
npm --prefix catalogo-ejercicios/frontend run build
```

El backend Express no se ejecuta con este despliegue estatico. Debe estar desplegado en un servicio compatible, por ejemplo Render, y el frontend debe apuntar a su URL publica para que funcionen la API, perfiles, favoritos y la IA.
