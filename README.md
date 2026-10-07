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

Para cambiar la URL del catalogo de tienda en el frontend, define:

```env
VITE_STORE_API_URL=https://api-titangym.onrender.com/storeitems
```

Si no se define, se utiliza esa URL automaticamente.

Para producción, define también la URL pública del backend Express:

```env
VITE_API_URL=https://tu-backend-publico.example.com/api
```

No uses `localhost` en esta variable de Vercel. La URL debe ser la dirección HTTPS del servicio donde ejecutes `catalogo-ejercicios/backend`.

### Configurar administradores

Los permisos de administrador ya no dependen de un email escrito en el código. Se consultan en Firestore:

```text
admins/{UID_DEL_USUARIO}
```

En Firebase Console:

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
