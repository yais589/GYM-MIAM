# 💪 Catálogo de Ejercicios - Versión 2.0

Aplicación web completa para explorar, catalogar y gestionar ejercicios de fitness con características avanzadas, integración con Firebase y diseño UI/UX mejorado.

## ✨ Características Principales

### 📋 Catálogo Avanzado
- ✅ Grid de 4+ ejercicios con filtrado por categorías
- ✅ Búsqueda y filtrado por dificultad
- ✅ Detalles completos de cada ejercicio (duración, calorías, instrucciones)
- ✅ Botón de favoritos integrado en cada card

### ❤️ Sistema de Favoritos
- ✅ Guardar ejercicios favoritos por usuario
- ✅ Vista dedicada a favoritos
- ✅ Gestor visual de favoritos
- ✅ Persistencia en backend

### 💪 Registro de Entrenamientos
- ✅ Logging automático de entrenamientos
- ✅ Cálculo automático de calorías quemadas
- ✅ Historial de entrenamientos
- ✅ Duración configurable

### 📊 Estadísticas Detalladas
- ✅ Total de entrenamientos realizados
- ✅ Minutos totales de ejercicio
- ✅ Calorías totales quemadas
- ✅ Actividad reciente (últimos 5 entrenamientos)
- ✅ Dashboard visual con gráficos

### 👤 Gestión de Usuario Completa
- ✅ Crear, ver y editar perfil
- ✅ Datos personales (nombre, email, edad, país)
- ✅ Contador de entrenamientos
- ✅ Sistema de streak (racha de entrenamientos)
- ✅ Almacenamiento en localStorage y backend

### 🌍 Características Multiidioma
- ✅ Español (ES)
- ✅ Inglés (EN)
- ✅ Selector dinámico en header
- ✅ Traducciones en todos los componentes

### 🎨 Diseño Moderno UI/UX
- ✅ Gradientes y efectos visuales premium
- ✅ Animaciones suaves y transiciones
- ✅ Diseño totalmente responsivo
- ✅ Dark/Light elements inteligentes
- ✅ Interfaz intuitiva y fácil de usar

### 🔧 Navegación por Tabs
- ✅ Catálogo
- ✅ Favoritos
- ✅ Entrenamientos
- ✅ Estadísticas
- ✅ Perfil
- ✅ Navegación sticky en el top

## 🏗️ Arquitectura

### Backend (Node.js + Express)
```
backend/
├── server.js              # Servidor principal con todas las rutas
├── config/
│   └── firebase.js        # Configuración de Firebase
├── package.json
├── .env.example
└── .gitignore
```

**Rutas API:**
- `GET /api/exercises` - Obtener todos los ejercicios
- `GET /api/exercises/:id` - Obtener ejercicio específico
- `GET /api/exercises/category/:category` - Filtrar por categoría
- `GET /api/exercises/difficulty/:difficulty` - Filtrar por dificultad
- `GET /api/exercises/search/:query` - Búsqueda por texto
- `GET /api/categories` - Obtener categorías
- `POST /api/user` - Crear usuario
- `GET /api/user/:id` - Obtener usuario
- `PUT /api/user/:id` - Actualizar usuario
- `DELETE /api/user/:id` - Eliminar usuario
- `GET /api/user/:userId/favorites` - Obtener favoritos
- `POST /api/user/:userId/favorites/:exerciseId` - Agregar a favoritos
- `DELETE /api/user/:userId/favorites/:exerciseId` - Remover de favoritos
- `POST /api/user/:userId/workout` - Registrar entrenamiento
- `GET /api/user/:userId/workouts` - Obtener entrenamientos
- `GET /api/user/:userId/stats` - Obtener estadísticas
- `GET /api/recommendations/:userId` - Obtener recomendaciones

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx              # Header con selector de idioma
│   │   ├── Catalog.jsx             # Catálogo principal
│   │   ├── CategoryMenu.jsx        # Menú desplegable
│   │   ├── ExerciseCard.jsx        # Card de ejercicio
│   │   ├── UserSection.jsx         # Gestión de usuario
│   │   ├── Favorites.jsx           # Vista de favoritos
│   │   ├── Statistics.jsx          # Estadísticas detalladas
│   │   ├── WorkoutLogger.jsx       # Registro de entrenamientos
│   │   └── Footer.jsx              # Footer mejorado
│   ├── services/
│   │   └── api.js                  # Cliente HTTP centralizado
│   ├── styles/
│   │   ├── index.css               # Estilos globales
│   │   ├── App.css                 # Estilos principales
│   │   ├── Header.css              # Estilos del header
│   │   ├── Catalog.css             # Estilos del catálogo
│   │   ├── CategoryMenu.css        # Estilos del menú
│   │   ├── ExerciseCard.css        # Estilos de cards
│   │   ├── UserSection.css         # Estilos de usuario
│   │   ├── Favorites.css           # Estilos de favoritos
│   │   ├── Statistics.css          # Estilos de estadísticas
│   │   ├── WorkoutLogger.css       # Estilos de registro
│   │   └── Footer.css              # Estilos del footer
│   ├── App.jsx                     # Componente principal
│   └── main.jsx                    # Punto de entrada
├── index.html
├── vite.config.js
└── package.json
```

## 🚀 Instalación y Uso

### Requisitos
- Node.js v16+
- npm o yarn
- Git (opcional)

### Backend

```bash
cd backend
npm install
npm run dev
```

**Servidor disponible en:** `http://localhost:5000`

### Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

**Aplicación disponible en:** `http://localhost:3000`

## 📊 Datos de Ejemplo

El sistema incluye datos de ejemplo con:
- **8 ejercicios** en 4 categorías (Body, Cardio, Flexibilidad, Fuerza)
- **Dificultades variadas** (Principiante, Intermedio, Avanzado)
- **Información completa** (duración, calorías, descripción, instrucciones)
- **Categorías con iconos** para mejor visualización

## 🎯 Flujo de Usuario

1. **Acceso**: Usuario entra a la aplicación
2. **Crear Perfil**: Opcional - crear usuario en la sección "Perfil"
3. **Explorar**: Navegar por el catálogo y filtrar por categorías
4. **Favoritos**: Marcar ejercicios como favoritos (ícono ❤️)
5. **Entrenar**: Registrar entrenamientos desde "Entrenamientos"
6. **Ver Stats**: Consultar progreso en "Estadísticas"
7. **Cambiar idioma**: Usar selector en header (ES/EN)

## 🔐 Seguridad y Persistencia

- **localStorage**: Datos del usuario se guardan localmente
- **Backend Storage**: Datos sincronizados en servidor
- **Firebase Ready**: Configurado para integración futura
- **CORS Habilitado**: Comunicación segura frontend-backend

## 🌟 Mejoras Realizadas

### Diseño UI/UX
- ✅ Gradientes modernos y atractivos
- ✅ Animaciones suaves (hover, slide-in, float)
- ✅ Efectos de sombra sofisticados
- ✅ Paleta de colores coherente
- ✅ Tipografía mejorada
- ✅ Spacing y alignment profesionales

### Funcionalidades Nuevas
- ✅ Sistema de favoritos completo
- ✅ Registro de entrenamientos
- ✅ Dashboard de estadísticas
- ✅ Búsqueda y filtrado avanzado
- ✅ Navegación por tabs
- ✅ Recomendaciones personalizadas

### Rendimiento
- ✅ Lazy loading de imágenes
- ✅ Optimización de CSS
- ✅ Componentes reutilizables
- ✅ API centralizada
- ✅ Caché local

## 📱 Responsividad

La aplicación es completamente responsiva:
- 🖥️ **Desktop** (1400px+) - Grid completo
- 📱 **Tablet** (768px-1399px) - Grid adaptado
- 📱 **Mobile** (<768px) - Single column

## 🔄 Rutas Disponibles

### Navegación Principal
- `/` - Catálogo (inicio)
- `/favorites` - Mis favoritos
- `/workouts` - Entrenamientos
- `/statistics` - Estadísticas
- `/profile` - Perfil

## 🚀 Próximas Características (Roadmap)

- [ ] Integración real con Firebase/Firestore
- [ ] Autenticación con Google/Email
- [ ] Sistema de desafíos y logros
- [ ] Rutinas pre-diseñadas
- [ ] Retos comunitarios
- [ ] Sistema de notificaciones
- [ ] Exportar datos a PDF
- [ ] Gráficos de progreso avanzados
- [ ] Integración con Spotify (música durante entrenamientos)
- [ ] API de imágenes reales de ejercicios
- [ ] Modo offline
- [ ] PWA (Progressive Web App)

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React** 18.2.0 - UI library
- **Vite** 5.0 - Build tool
- **Axios** 1.6 - HTTP client
- **CSS3** - Estilos avanzados

### Backend
- **Node.js** - Runtime
- **Express** 4.18 - Framework
- **Firebase Admin** 12.0 - Autenticación
- **CORS** 2.8 - Cross-origin

### DevTools
- **Nodemon** - Auto-reload
- **Vite Plugin React** - JSX support

## 📝 Variables de Entorno

### Backend (.env)
```
PORT=5000
NODE_ENV=development
VITE_API_URL=http://localhost:5000/api
FIREBASE_PROJECT_ID=catalogo-ejercicios
```

### Frontend (vite.config.js)
```
Proxy: http://localhost:5000/api
```

## 💬 Soporte y Contacto

Para reportar bugs o sugerir mejoras, crea un issue en el repositorio.

## 📄 Licencia

MIT License - Libre para usar y modificar

## 👨‍💻 Autor

Proyecto desarrollado para la plataforma de ejercicios del grupo MIAM.

---

**¡Haz ejercicio, mantente en forma y alcanza tus objetivos de salud! 💪**
