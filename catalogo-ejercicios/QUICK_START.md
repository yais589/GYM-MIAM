# 🚀 GUÍA DE INICIO RÁPIDO - VERSIÓN 2.0

## Paso 1: Instalar dependencias

### Terminal 1 - Backend
```bash
cd backend
npm install
npm run dev
```

### Terminal 2 - Frontend  
```bash
cd frontend
npm install
npm run dev
```

## Paso 2: Acceder a la aplicación

Abre tu navegador en: **http://localhost:3000**

---

# 📺 INTERFAZ VISUAL

## 🎨 Header (Parte Superior)
```
┌─────────────────────────────────────────────────────────────┐
│ 💪 Catálogo de Ejercicios                        [ES] [EN] │
│    Descubre ejercicios para todas las categorías              │
└─────────────────────────────────────────────────────────────┘
```

- **Título**: "Catálogo de Ejercicios"
- **Descripción**: Información sobre la plataforma
- **Selector de Idioma**: ES/EN (arriba a la derecha)

## 📊 Navegación Horizontal (Sticky)
```
┌──────────────────────────────────────────────────────────────┐
│ 📚 Catálogo | ❤️ Favoritos | 💪 Entrenamientos | 📊 Estadísticas | 👤 Perfil │
└──────────────────────────────────────────────────────────────┘
```

Tabs dinámicos que cambian según si el usuario está registrado.

## 📋 VISTA: CATÁLOGO (Inicio)

```
┌─ CATÁLOGO ─────────────────────────────────────┐
│                                                 │
│ ☰ Categorías      [Grid de Ejercicios - 4 cols]│
│ ├─ Todos                                        │
│ ├─ 💪 Body         ┌──────┬──────┬──────┬──────┐
│ ├─ 🏃 Cardio       │      │      │      │ ❤️   │
│ ├─ 🧘 Flexibilidad │ Img  │ Img  │ Img  │      │
│ └─ 🏋️ Fuerza      ├──────┼──────┼──────┼──────┤
│                    │Nombre│Nombre│Nombre│Nombre│
│                    │Body  │Cardio│Flex  │Fuerza│
│                    │Dif   │Dif   │Dif   │Dif   │
│                    └──────┴──────┴──────┴──────┘
└─ CATÁLOGO ─────────────────────────────────────┘
```

**Características:**
- Menú desplegable de categorías a la izquierda
- Grid responsivo (4 columnas en desktop)
- Botón ❤️ en cada card para agregar a favoritos
- Filtrado en tiempo real

## ❤️ VISTA: FAVORITOS

```
┌─ MIS FAVORITOS ─────────────────────────────────┐
│                                                  │
│  ┌──────┬──────┬──────┬──────┐                  │
│  │      │      │      │      │                  │
│  │ Img  │ Img  │ Img  │ ...  │                  │
│  ├──────┼──────┼──────┼──────┤                  │
│  │Nombre│Nombre│Nombre│      │                  │
│  │[Remov│[Remov│[Remov│      │                  │
│  └──────┴──────┴──────┴──────┘                  │
│                                                  │
│  "No tienes ejercicios favoritos" (si está vacío)
└─ MIS FAVORITOS ─────────────────────────────────┘
```

**Características:**
- Muestra solo ejercicios marcados como favoritos
- Botón "Remover" en cada card
- Sincronización en tiempo real

## 💪 VISTA: ENTRENAMIENTOS

```
┌─ REGISTRAR ENTRENAMIENTO ───────────────────────┐
│                                                  │
│  Selecciona un ejercicio:                        │
│  ┌──────────────────────────────────────┐       │
│  │ -- Selecciona un ejercicio --        │ ▼    │
│  └──────────────────────────────────────┘       │
│                                                  │
│  Duración (minutos):                            │
│  ┌──────────────────────────────────────┐       │
│  │ 15                                    │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │     REGISTRAR ENTRENAMIENTO            │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  ✅ ¡Entrenamiento registrado!  (mensaje)       │
└─ REGISTRAR ENTRENAMIENTO ───────────────────────┘
```

**Características:**
- Seleccionar ejercicio de dropdown
- Ingresar duración
- Cálculo automático de calorías
- Confirmación visual

## 📊 VISTA: ESTADÍSTICAS

```
┌─ MIS ESTADÍSTICAS ──────────────────────────────┐
│                                                  │
│  ┌──────────────┬──────────────┬──────────────┐ │
│  │ 🏋️ 42        │ ⏱️ 630min    │ 🔥 3150kcal │ │
│  │ Entrenamientos│ Minutos Total│ Calorías Qda │
│  └──────────────┴──────────────┴──────────────┘ │
│                                                  │
│  Actividad Reciente:                            │
│  • 2024-01-15 - 20min - 100kcal                │
│  • 2024-01-14 - 30min - 150kcal                │
│  • 2024-01-13 - 15min - 75kcal                 │
│  • 2024-01-12 - 25min - 125kcal                │
│  • 2024-01-11 - 20min - 100kcal                │
│                                                  │
└─ MIS ESTADÍSTICAS ──────────────────────────────┘
```

**Características:**
- 3 cards principales con estadísticas
- Actividad reciente (últimos 5 entrenamientos)
- Actualización automática

## 👤 VISTA: PERFIL

```
┌─ PERFIL DE USUARIO ────────────────────────────┐
│                                                 │
│ Modo Visualización:                             │
│  Nombre: Juan García                            │
│  Email: juan@example.com                        │
│  Edad: 25                                       │
│  País: España                                   │
│  ┌─────────────────┐                           │
│  │ EDITAR PERFIL   │                           │
│  └─────────────────┘                           │
│                                                 │
│ Modo Edición:                                   │
│  ┌──────────────────────────────┐              │
│  │ Nombre: [            ]        │              │
│  │ Email:  [            ]        │              │
│  │ Edad:   [   ]                 │              │
│  │ País:   [            ]        │              │
│  │ ┌──────────┬──────────┐       │              │
│  │ │ GUARDAR  │ CANCELAR │       │              │
│  │ └──────────┴──────────┘       │              │
│  └──────────────────────────────┘              │
│                                                 │
│ Si no hay usuario:                              │
│  "No hay usuario registrado"                    │
│  ┌─────────────────────┐                       │
│  │ CREAR USUARIO        │                       │
│  └─────────────────────┘                       │
└─ PERFIL DE USUARIO ────────────────────────────┘
```

**Características:**
- Ver datos del usuario
- Editar en modo formulario
- Crear usuario nuevo
- Guardar localmente

## 🔗 FOOTER
```
┌─────────────────────────────────────────────────┐
│ Catálogo de Ejercicios    │ Navegación    │ RRSS│
│ Tu plataforma de confianza│ • Acerca de   │ • FB│
│                           │ • Contacto    │ • TW│
│                           │ • Privacidad  │ • IG│
│                           │ • Términos    │     │
├─────────────────────────────────────────────────┤
│ © 2024 Catálogo de Ejercicios. Todos los DR.   │
└─────────────────────────────────────────────────┘
```

---

# 🎯 FLUJO TÍPICO DE USUARIO

## Sesión 1: Crear Perfil
1. Abre http://localhost:3000
2. Ve el Catálogo con todos los ejercicios
3. Haz clic en tab "👤 Perfil"
4. Haz clic en "CREAR USUARIO"
5. Rellena: Nombre, Email, Edad, País
6. Haz clic en "GUARDAR"

## Sesión 2: Usar la App
1. Navega por el Catálogo
2. Marca favoritos (❤️) en las cards
3. Ve a "❤️ Favoritos" para verlos
4. Registra un entrenamiento en "💪 Entrenamientos"
5. Mira tus estadísticas en "📊 Estadísticas"
6. Cambia de idioma en el Header (ES/EN)

---

# 🔧 DATOS DE EJEMPLO

## Ejercicios Disponibles
- **Flexiones** (Body, Principiante, 15min)
- **Sentadillas** (Body, Intermedio, 20min)
- **Abdominales** (Body, Principiante, 10min)
- **Dominadas** (Body, Avanzado, 30min)
- **Burpees** (Cardio, Intermedio, 25min)
- **Trotar** (Cardio, Principiante, 30min)
- **Yoga** (Flexibilidad, Principiante, 45min)
- **Estiramientos** (Flexibilidad, Principiante, 15min)

## Categorías
| Icono | Nombre | Descripción |
|-------|--------|-------------|
| 💪 | Body | Ejercicios de peso corporal |
| 🏃 | Cardio | Ejercicios de resistencia |
| 🧘 | Flexibilidad | Ejercicios de flexibilidad |
| 🏋️ | Fuerza | Ejercicios con peso |

---

# 📱 RESPONSIVIDAD

| Dispositivo | Tamaño | Comportamiento |
|-------------|--------|-----------------|
| Desktop | 1400px+ | Grid 4 columnas |
| Tablet | 768-1399px | Grid 2-3 columnas |
| Mobile | <768px | Grid 1 columna |

---

# 🌍 IDIOMAS

### Español (ES)
- Todos los textos en español
- Nombres de categorías en español
- Mensajes y botones en español

### Inglés (EN)
- Todos los textos en inglés
- Nombres de categorías en inglés
- Mensajes y botones en inglés

**Cambiar:** Haz clic en [ES] o [EN] en el header

---

# ❓ PREGUNTAS FRECUENTES

**P: ¿Dónde se guardan mis datos?**
A: En localStorage (navegador) y en el backend en memoria.

**P: ¿Puedo cambiar idioma después?**
A: Sí, usa el selector en el header en cualquier momento.

**P: ¿Se borra mi usuario si recargo la página?**
A: No, los datos se guardan en localStorage.

**P: ¿Cómo agrego más ejercicios?**
A: Edita el array en `backend/server.js` en la variable `db.exercises`.

**P: ¿Funciona sin internet?**
A: Parcialmente - el catálogo se carga en cache, pero los entrenamientos nuevos no se guardarán.

---

# 🎉 ¡Listo!

Tu aplicación de ejercicios está completamente funcional. 

**Próximos pasos sugeridos:**
1. Agrega tu propia foto/avatar
2. Crea tus propios ejercicios
3. Comparte con amigos
4. Crea desafíos grupales
5. Integra con Firebase para datos en la nube

¡A entrenar! 💪

