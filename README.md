# Sistema de Inventario FAE - Probetas de Materiales

Sistema completo de gestión de inventario para la Fuerza Aérea Ecuatoriana, diseñado para administrar probetas de materiales con datos técnicos específicos.

## 🚀 Características

### Frontend
- **Interfaz moderna y responsiva** con diseño profesional
- **Sistema de autenticación** seguro
- **Dashboard interactivo** con estadísticas en tiempo real
- **Gestión de lotes** de probetas
- **Gestión individual de probetas** con datos técnicos detallados
- **Búsqueda y filtrado avanzado**
- **Reportes y estadísticas**
- **Actividad reciente** del sistema

### Backend
- **API REST** completa con Express.js
- **Base de datos PostgreSQL** optimizada
- **Autenticación JWT** segura
- **Validación de datos** robusta
- **Transacciones de base de datos** para integridad
- **Logging de actividad** completa
- **CORS configurado** para desarrollo
- **Middleware de seguridad** (Helmet)

## 📋 Requisitos Previos

### Software Necesario
- **Node.js** (versión 16 o superior)
- **PostgreSQL** (versión 12 o superior)
- **npm** o **yarn**

### Configuración de PostgreSQL
1. Instalar PostgreSQL en tu sistema
2. Crear un usuario con permisos de administrador
3. Anotar las credenciales de conexión

## 🛠️ Instalación

### 1. Clonar o descargar el proyecto
```bash
# Si tienes Git
git clone <url-del-repositorio>
cd FAE_INVENTARIO

# O simplemente descargar y extraer el archivo
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Editar el archivo `config.env` con tus credenciales de PostgreSQL:

```env
# Configuración del Servidor
PORT=3000
NODE_ENV=development

# Configuración de Base de Datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fae_inventario
DB_USER=postgres
DB_PASSWORD=tu_password_aqui

# Configuración JWT
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=24h

# Configuración CORS
CORS_ORIGIN=http://localhost:5500
```

### 4. Configurar la base de datos
```bash
npm run db:setup
```

Este comando:
- Crea la base de datos `fae_inventario`
- Crea todas las tablas necesarias
- Inserta datos de muestra
- Crea un usuario administrador

### 5. Iniciar el servidor
```bash
# Modo desarrollo (con recarga automática)
npm run dev

# Modo producción
npm start
```

## 🌐 Uso

### Acceso al Sistema
1. **Frontend**: Abrir `index.html` en tu navegador
2. **Backend API**: Disponible en `http://localhost:3000`

### Credenciales por Defecto
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Estructura de la API

#### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/me` - Obtener información del usuario

#### Lotes
- `GET /api/batches` - Obtener todos los lotes
- `GET /api/batches/:id` - Obtener lote específico
- `POST /api/batches` - Crear nuevo lote
- `PUT /api/batches/:id` - Actualizar lote
- `DELETE /api/batches/:id` - Eliminar lote

#### Probetas
- `GET /api/specimens` - Obtener probetas con filtros
- `GET /api/specimens/:id` - Obtener probeta específica
- `POST /api/specimens` - Crear nueva probeta
- `PUT /api/specimens/:id` - Actualizar probeta
- `DELETE /api/specimens/:id` - Eliminar probeta

#### Dashboard
- `GET /api/dashboard/stats` - Estadísticas generales
- `GET /api/dashboard/activity` - Actividad reciente
- `GET /api/dashboard/charts` - Datos para gráficos
- `GET /api/dashboard/reports` - Reportes

## 📊 Estructura de la Base de Datos

### Tablas Principales

#### `users`
- Gestión de usuarios del sistema
- Autenticación y roles

#### `batches`
- Lotes de probetas
- Información general del lote

#### `specimens`
- Probetas individuales
- Datos técnicos detallados:
  - Orden y fecha
  - Orientación de fibras
  - Descripción del material
  - Tipo de ensayo
  - Tipo de fibra
  - Fuerza máxima
  - Módulo de elasticidad
  - Tipo de resina
  - Condiciones de curado

#### `user_activity`
- Registro de todas las actividades
- Auditoría del sistema

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar servidor en modo desarrollo

# Producción
npm start            # Iniciar servidor en modo producción

# Base de datos
npm run db:setup     # Configurar base de datos

# Construcción
npm run build        # Construir proyecto (si aplica)
```

## 🚨 Seguridad

### Características de Seguridad Implementadas
- **Contraseñas hasheadas** con bcrypt
- **Tokens JWT** para autenticación
- **Validación de datos** en todas las rutas
- **Middleware de seguridad** (Helmet)
- **CORS configurado** apropiadamente
- **Transacciones de base de datos** para integridad

### Recomendaciones de Seguridad
1. **Cambiar contraseñas por defecto** en producción
2. **Usar variables de entorno** para configuraciones sensibles
3. **Configurar HTTPS** en producción
4. **Implementar rate limiting** para APIs públicas
5. **Realizar backups regulares** de la base de datos

## 📁 Estructura del Proyecto

```
FAE_INVENTARIO/
├── config/
│   └── database.js          # Configuración de PostgreSQL
├── middleware/
│   └── auth.js              # Middleware de autenticación
├── routes/
│   ├── auth.js              # Rutas de autenticación
│   ├── batches.js           # Rutas de lotes
│   ├── specimens.js         # Rutas de probetas
│   └── dashboard.js         # Rutas del dashboard
├── scripts/
│   └── setupDatabase.js     # Script de configuración de BD
├── public/
│   └── images/              # Imágenes del proyecto
├── index.html               # Frontend principal
├── script.js                # JavaScript del frontend
├── styles.css               # Estilos CSS
├── server.js                # Servidor principal
├── package.json             # Dependencias y scripts
├── config.env               # Variables de entorno
└── README.md                # Documentación
```

## 🐛 Solución de Problemas

### Error de Conexión a PostgreSQL
1. Verificar que PostgreSQL esté ejecutándose
2. Confirmar credenciales en `config.env`
3. Verificar que el usuario tenga permisos de administrador

### Error de Puerto en Uso
1. Cambiar el puerto en `config.env`
2. Verificar que no haya otro servicio usando el puerto 3000

### Error de CORS
1. Verificar la configuración de `CORS_ORIGIN` en `config.env`
2. Asegurar que el frontend esté en el puerto correcto

## 📞 Soporte

Para soporte técnico o reportar problemas:
- Revisar la documentación de la API
- Verificar los logs del servidor
- Contactar al equipo de desarrollo

## 📄 Licencia

Este proyecto está desarrollado para la Fuerza Aérea Ecuatoriana.

---

**Desarrollado con ❤️ para la FAE** 