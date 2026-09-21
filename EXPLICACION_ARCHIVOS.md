# Explicación de los archivos del proyecto

Este proyecto es una aplicación web de ejercicios dividida en **frontend**, **backend** y scripts auxiliares.

## Archivos de la raíz

- `package.json`: Dependencias y configuración general del proyecto principal.
- `package-lock.json`: Guarda las versiones exactas de las dependencias instaladas.
- `.gitignore`: Indica qué archivos no deben subirse a Git, como `node_modules` o claves privadas.
- `README.md`: Descripción general del proyecto.
- `JsWger.js`: Descarga datos de ejercicios desde la API Wger y los guarda en Firebase Firestore.
- `enrich-exercises.js`: Completa los ejercicios almacenados con nombres, descripciones e imágenes.
- `firebase-key.json`: Credenciales privadas para conectar con Firebase. No debe compartirse ni subirse a Git.
- `node_modules/`: Dependencias instaladas automáticamente por npm.
- `client/`: Carpeta auxiliar o antigua; actualmente solo contiene un `package-lock.json`.

## Documentación

Dentro de `catalogo-ejercicios/`:

- `README.md`: Explica el proyecto, sus funciones y cómo instalarlo.
- `QUICK_START.md`: Guía rápida para iniciar el backend y el frontend.
- `DEVELOPMENT.md`: Explica la estructura y las normas para desarrollar el proyecto.
- `FEATURES.md`: Lista detallada de funcionalidades y rutas de la API.
- `CHANGELOG.md`: Historial de cambios y mejoras realizadas.

## Backend

El backend se encuentra en `catalogo-ejercicios/backend/`.

- `server.js`: Servidor principal de Express. Define las rutas de ejercicios, categorías, usuarios, favoritos, entrenamientos y estadísticas.
- `config/firebase.js`: Configura Firebase Admin, Firestore y la autenticación.
- `package.json`: Dependencias y comandos del backend.
- `node_modules/`: Librerías instaladas para el servidor.

## Frontend

El frontend se encuentra en `catalogo-ejercicios/frontend/`.

### Archivos principales

- `index.html`: Documento HTML inicial donde React se monta en el elemento `root`.
- `vite.config.js`: Configura Vite, el puerto `3000` y el proxy hacia el backend.
- `package.json`: Dependencias y comandos de React/Vite.
- `package-lock.json`: Versiones exactas de las dependencias del frontend.

### Archivos principales de React

- `src/main.jsx`: Punto de entrada. Renderiza el componente principal `App`.
- `src/App.jsx`: Componente principal. Controla el idioma, la autenticación, el perfil, el catálogo y las páginas legales.

## Componentes React

Todos están dentro de `catalogo-ejercicios/frontend/src/components/`.

- `Header.jsx`: Encabezado y selector de idioma.
- `Catalog.jsx`: Muestra los ejercicios, las categorías, la carga de datos y los favoritos.
- `CategoryMenu.jsx`: Menú para filtrar ejercicios por categoría.
- `ExerciseCard.jsx`: Tarjeta individual de ejercicio con imagen, dificultad, detalles y favoritos.
- `Favorites.jsx`: Vista completa de los ejercicios favoritos.
- `FavoritesDrawer.jsx`: Panel lateral rápido para consultar los favoritos.
- `LoginPage.jsx`: Inicio de sesión mediante un enlace enviado por correo.
- `AuthPrompt.jsx`: Mensaje que solicita iniciar sesión.
- `UserSection.jsx`: Formulario para crear o editar el perfil del usuario.
- `UserPicker.jsx`: Permite seleccionar un usuario guardado.
- `Welcome.jsx`: Muestra la bienvenida y los datos del usuario.
- `WorkoutLogger.jsx`: Formulario para registrar entrenamientos.
- `Statistics.jsx`: Muestra minutos, calorías y entrenamientos realizados.
- `Footer.jsx`: Pie de página y enlaces informativos.
- `CookieBanner.jsx`: Aviso sobre cookies.
- `LegalPage.jsx`: Muestra la política de privacidad, la política de cookies y el aviso legal.

## Servicios

Están dentro de `catalogo-ejercicios/frontend/src/services/`.

- `api.js`: Cliente Axios con funciones para llamar a las rutas del backend.
- `firebase.js`: Configura Firebase en el navegador y la autenticación.
- `profile.js`: Obtiene y guarda perfiles y favoritos de usuarios autenticados.

## Archivos CSS

Están dentro de `catalogo-ejercicios/frontend/src/styles/`. Cada archivo contiene los estilos del componente con el mismo nombre.

- `index.css`: Estilos globales.
- `App.css`: Estilos generales de la aplicación.
- `Header.css`: Diseño del encabezado.
- `Catalog.css`: Diseño del catálogo.
- `CategoryMenu.css`: Estilos del menú de categorías.
- `ExerciseCard.css`: Estilos de las tarjetas de ejercicios.
- `Favorites.css`: Diseño de la vista de favoritos.
- `FavoritesDrawer.css`: Diseño del panel lateral de favoritos.
- `LoginPage.css`: Diseño de la pantalla de inicio de sesión.
- `AuthPrompt.css`: Estilos del aviso de autenticación.
- `UserSection.css`: Diseño del formulario de perfil.
- `UserPicker.css`: Estilos del selector de usuarios.
- `Welcome.css`: Diseño de la bienvenida.
- `WorkoutLogger.css`: Diseño del registro de entrenamientos.
- `Statistics.css`: Diseño de las estadísticas.
- `Footer.css`: Estilos del pie de página.
- `CookieBanner.css`: Diseño del aviso de cookies.
- `LegalPage.css`: Diseño de las páginas legales.

## Resumen de la arquitectura

- **React** muestra la interfaz y gestiona la interacción del usuario.
- **Express** gestiona la API del proyecto.
- **Firebase** guarda usuarios, perfiles, favoritos y datos de ejercicios.
- **Axios y Fetch** permiten comunicar el frontend con el backend.
- **CSS** controla la apariencia visual de cada parte de la aplicación.