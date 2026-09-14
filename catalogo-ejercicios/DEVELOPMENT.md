# 👨‍💻 GUÍA DE DESARROLLO

## Bienvenido al Catálogo de Ejercicios

Este documento te guiará a través de la estructura del proyecto y cómo contribuir.

---

## 🏗️ ESTRUCTURA DEL PROYECTO

```
catalogo-ejercicios/
│
├── backend/
│   ├── server.js                 # Servidor principal
│   ├── config/
│   │   └── firebase.js           # Configuración Firebase
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Componentes React
│   │   │   ├── Header.jsx
│   │   │   ├── Catalog.jsx
│   │   │   ├── CategoryMenu.jsx
│   │   │   ├── ExerciseCard.jsx
│   │   │   ├── UserSection.jsx
│   │   │   ├── Favorites.jsx
│   │   │   ├── Statistics.jsx
│   │   │   ├── WorkoutLogger.jsx
│   │   │   └── Footer.jsx
│   │   ├── services/             # Servicios HTTP
│   │   │   └── api.js           # Cliente Axios
│   │   ├── styles/               # Estilos CSS
│   │   │   ├── index.css
│   │   │   ├── App.css
│   │   │   ├── Header.css
│   │   │   ├── Catalog.css
│   │   │   ├── CategoryMenu.css
│   │   │   ├── ExerciseCard.css
│   │   │   ├── UserSection.css
│   │   │   ├── Favorites.css
│   │   │   ├── Statistics.css
│   │   │   ├── WorkoutLogger.css
│   │   │   └── Footer.css
│   │   ├── App.jsx               # Componente principal
│   │   └── main.jsx              # Punto de entrada
│   ├── index.html
│   ├── vite.config.js            # Config Vite
│   ├── package.json
│   └── .gitignore
│
├── docs/                         # Documentación
│   ├── README.md
│   ├── QUICK_START.md
│   ├── FEATURES.md
│   ├── CHANGELOG.md
│   └── DEVELOPMENT.md            # Este archivo
│
└── .gitignore

```

---

## 🚀 CONFIGURACIÓN DEL ENTORNO

### Requisitos
- Node.js v16+
- npm v8+
- Git
- Editor: VSCode (recomendado)

### Instalación Inicial

1. **Clonar repositorio**
```bash
git clone <repo-url>
cd catalogo-ejercicios
```

2. **Configurar Backend**
```bash
cd backend
npm install
cp .env.example .env
# Editar .env si es necesario
npm run dev
```

3. **Configurar Frontend** (en otra terminal)
```bash
cd frontend
npm install
npm run dev
```

4. **Acceder**
```
http://localhost:3000
```

---

## 📝 CONVENCIONES DE CÓDIGO

### JavaScript/React

#### Nombres
```javascript
// ✅ Bueno
const getUserData = () => {}
const isUserActive = true
const MAX_ITEMS = 10

// ❌ Malo
const getdata = () => {}
const useractive = true
const max_items = 10
```

#### Componentes
```javascript
// ✅ Bueno
function UserProfile({ user }) {
  return (
    <div className="user-profile">
      {/* contenido */}
    </div>
  )
}

// ❌ Malo
function userprofile({ user }) {
  return <div>{/* contenido */}</div>
}
```

#### Props
```javascript
// ✅ Bueno
function Card({ title, description, user }) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

// ❌ Malo
function Card(props) {
  return (
    <div>
      <h3>{props.title}</h3>
      <p>{props.description}</p>
    </div>
  )
}
```

### CSS

#### Clases
```css
/* ✅ Bueno - BEM */
.exercise-card { }
.exercise-card__image { }
.exercise-card--favorite { }

/* ❌ Malo */
.exerciseCard { }
.image { }
.fav { }
```

#### Variables
```css
/* ✅ Bueno */
:root {
  --primary-color: #667eea;
  --spacing-unit: 8px;
}

/* ❌ Malo */
:root {
  --blue: #667eea;
  --space: 8px;
}
```

---

## 🔄 GIT WORKFLOW

### Ramas
```
main         - Producción
develop      - Desarrollo
feature/*    - Nuevas características
bugfix/*     - Correcciones
```

### Commits
```bash
# ✅ Bueno
git commit -m "feat: agregar sistema de favoritos"
git commit -m "fix: corregir cálculo de calorías"
git commit -m "docs: actualizar README"

# ❌ Malo
git commit -m "updates"
git commit -m "fix bug"
git commit -m "wip"
```

### Tipos de Commit
- `feat:` Nueva característica
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato
- `refactor:` Refactorización
- `test:` Cambios en tests
- `chore:` Tareas mantenimiento

---

## 🧩 AGREGAR NUEVO COMPONENTE

### Paso 1: Crear el componente
```bash
touch frontend/src/components/MyComponent.jsx
```

### Paso 2: Escribir el componente
```javascript
import '../styles/MyComponent.css'

function MyComponent({ prop1, prop2 }) {
  return (
    <div className="my-component">
      {/* Contenido */}
    </div>
  )
}

export default MyComponent
```

### Paso 3: Crear estilos
```bash
touch frontend/src/styles/MyComponent.css
```

### Paso 4: Escribir CSS
```css
.my-component {
  padding: 20px;
  border-radius: 12px;
  background: white;
}
```

### Paso 5: Importar en App.jsx
```javascript
import MyComponent from './components/MyComponent'

function App() {
  return (
    <>
      <MyComponent prop1="valor" prop2="valor" />
    </>
  )
}
```

---

## 🛠️ AGREGAR NUEVA RUTA API

### Backend (server.js)

```javascript
// GET endpoint
app.get('/api/resource/:id', (req, res) => {
  const { id } = req.params;
  try {
    const resource = db.resources[id];
    if (!resource) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST endpoint
app.post('/api/resource', (req, res) => {
  try {
    const newResource = {
      id: uuidv4(),
      ...req.body,
      createdAt: new Date()
    };
    db.resources[newResource.id] = newResource;
    res.status(201).json(newResource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT endpoint
app.put('/api/resource/:id', (req, res) => {
  try {
    if (!db.resources[req.params.id]) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    db.resources[req.params.id] = {
      ...db.resources[req.params.id],
      ...req.body
    };
    res.json(db.resources[req.params.id]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE endpoint
app.delete('/api/resource/:id', (req, res) => {
  try {
    delete db.resources[req.params.id];
    res.json({ message: 'Eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend (services/api.js)

```javascript
export const getResource = (id) => api.get(`/resource/${id}`);
export const createResource = (data) => api.post('/resource', data);
export const updateResource = (id, data) => api.put(`/resource/${id}`, data);
export const deleteResource = (id) => api.delete(`/resource/${id}`);
```

### Componente

```javascript
import { getResource, createResource } from '../services/api'

function MyComponent() {
  const [resource, setResource] = useState(null);

  useEffect(() => {
    loadResource();
  }, []);

  const loadResource = async () => {
    try {
      const res = await getResource(1);
      setResource(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return <div>{/* Usar resource */}</div>;
}
```

---

## 🎨 GUÍA DE ESTILOS

### Paleta de Colores
```css
--primary: #667eea       /* Índigo */
--secondary: #764ba2     /* Púrpura */
--accent: #ec4899        /* Rosa */
--success: #4CAF50       /* Verde */
--warning: #FFC107       /* Amarillo */
--danger: #FF5722        /* Naranja */
--gray-light: #f5f7fa
--gray-dark: #1f2937
```

### Espaciado
```css
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 20px
--space-xl: 30px
--space-2xl: 40px
```

### Breakpoints
```css
--mobile: 480px
--tablet: 768px
--desktop: 1024px
--wide: 1400px
```

### Sombras
```css
--shadow-sm: 0 2px 4px rgba(0,0,0,0.1)
--shadow-md: 0 4px 12px rgba(0,0,0,0.15)
--shadow-lg: 0 8px 24px rgba(0,0,0,0.2)
```

---

## 🧪 TESTING

### Componentes
```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText(/test/i)).toBeInTheDocument();
  });
});
```

### API
```javascript
describe('API calls', () => {
  it('fetches exercises', async () => {
    const response = await getExercises();
    expect(response.status).toBe(200);
    expect(response.data).toBeInstanceOf(Array);
  });
});
```

---

## 🐛 DEBUGGING

### Browser DevTools
```javascript
// Console
console.log('Debug:', variable);
console.error('Error:', error);
console.time('timer');
// ... código ...
console.timeEnd('timer');

// Breakpoints
// F12 -> Sources -> Click línea
```

### Network Tab
```
F12 -> Network
- Ver requests
- Ver responses
- Ver headers
- Ver timing
```

### React DevTools
```
Installar extensión: React Developer Tools
- Ver component tree
- Ver props y state
- Profiler
```

---

## 📦 BUILD Y DEPLOY

### Development
```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && npm run dev
```

### Production Build
```bash
cd frontend
npm run build
# Genera dist/
```

### Deployment
```bash
# Vercel (Frontend)
vercel deploy

# Heroku (Backend)
git push heroku main
```

---

## 🔒 VARIABLES DE ENTORNO

### Backend (.env)
```
PORT=5000
NODE_ENV=development
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=your-key
# etc...
```

### Frontend (vite.config.js)
```javascript
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
}
```

---

## 📚 RECURSOS

### Documentación Oficial
- [React Docs](https://react.dev)
- [Express Docs](https://expressjs.com)
- [Vite Docs](https://vitejs.dev)
- [Firebase Docs](https://firebase.google.com/docs)

### Herramientas
- [Axios Docs](https://axios-http.com)
- [CSS Tricks](https://css-tricks.com)
- [MDN Web Docs](https://developer.mozilla.org)

---

## 🤝 CONTRIBUIR

1. Fork el repositorio
2. Crea rama: `git checkout -b feature/tu-feature`
3. Commit cambios: `git commit -m 'feat: descripción'`
4. Push: `git push origin feature/tu-feature`
5. Pull Request

### Checklist PR
- [ ] Código formateado
- [ ] Tests pasan
- [ ] Documentación actualizada
- [ ] Sin console.logs innecesarios
- [ ] Mobile responsive
- [ ] Accesibilidad OK

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Cómo cambio el puerto del backend?**
A: Edita `.env` PORT=3001

**P: ¿Cómo agrego un nuevo idioma?**
A: Ve a cada componente y actualiza `translations` object

**P: ¿Cómo integro Firebase?**
A: Edita `backend/config/firebase.js` con tus credenciales

**P: ¿Dónde están los logs?**
A: Console del navegador (F12) y terminal del servidor

---

## 🆘 SOPORTE

- **Bugs**: Abre issue en GitHub
- **Preguntas**: Revisa la documentación
- **Ideas**: Crea feature request

---

**Última actualización: 2024-01-15**  
**Versión: 2.0**  
**Mantenedor: Equipo MIAM**
