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
- Carrito, descuentos por plan y formulario de compra.
- Paginas legales y aviso de cookies.

## Configuracion

El backend usa `catalogo-ejercicios/backend/.env`. Puedes copiar `.env.example` y completar las variables de Firebase y correo necesarias.

No publiques `firebase-key.json`, `.env` ni ninguna credencial en el repositorio.

### Rol de administrador

El rol visible del perfil se guarda en Firestore en `profiles/{uid}` mediante el campo `role` (`admin` o `user`). La fuente de autoridad para los permisos es `userRoles/{uid}`: el backend toma el correo de administrador de `ADMIN_EMAIL` (si no se configura, usa el valor predeterminado de la API), asigna y persiste el rol en esa colección y lo refleja en el perfil. Esto evita confiar en campos de perfil arbitrarios que pudieran haberse guardado antes de este cambio. El endpoint de perfil no permite que un usuario cambie su propio rol; las reglas de Firestore también deben impedir escrituras directas de clientes en `userRoles`.

Configura `ADMIN_EMAIL` en las variables de entorno del **backend** y despliega de nuevo ese servicio. En este proyecto Vercel sirve el frontend estático; no necesita esa variable ni credenciales de Firebase Admin. Al iniciar sesión con el correo configurado, el rol aparecerá en el documento `profiles/{uid}` de Firestore. Las credenciales de Firebase Admin deben permanecer únicamente en el entorno seguro del backend.

En la configuración del proyecto de Vercel, define `VITE_API_URL` con la URL base pública del backend, sin añadir `/api`. Por ejemplo:

```env
VITE_API_URL=https://tu-backend.onrender.com
```

El backend debe permitir solicitudes CORS desde el dominio de Vercel. En desarrollo local, si no se define `VITE_API_URL`, Vite usa el proxy a `http://localhost:5000`.

Para cambiar la URL del catalogo de tienda en el frontend, define:

```env
VITE_STORE_API_URL=https://api-titangym.onrender.com/storeitems
```

Si no se define, se utiliza esa URL automaticamente.

## API principal

- `GET /api/health`
- `GET /api/exercises`
- `GET /api/categories`
- `GET /api/nutrition`
- `GET /api/storeitems`
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
