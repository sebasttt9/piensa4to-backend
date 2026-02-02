\n+chore: trigger Vercel redeploy
## DataPulse API (NestJS)

Backend de la plataforma **DataPulse**. Expone un API REST modular para autenticación, gestión de datasets, dashboards inteligentes y análisis automático de archivos CSV/XLSX.

### Arquitectura

- **Dos bases de datos Supabase separadas**:
  - **Base principal**: Autenticación y usuarios (`users`, `auth`)
  - **Base de datos**: Issues, inventory, datasets y analytics (`issues`, `inventory`, `datasets`, `analytics`)
- **Sincronización automática de usuarios** entre bases de datos para mantener consistencia de foreign keys
- **JWT + roles (admin/analista)** mediante Passport y estrategias personalizadas basadas en email

### Características principales

- **JWT + roles (admin/analista)** mediante Passport y estrategias personalizadas.
- **Carga de datasets** con Multer en memoria, parsing con PapaParse/XLSX y persistencia en Supabase Postgres.
- **Servicio de análisis** que detecta tipos de columnas, calcula estadísticas y propone visualizaciones.
- **Gestión de dashboards** guardados por usuario con validaciones de ownership respaldadas en Supabase.
- **Sistema de issues/tickets** con foreign keys a usuarios sincronizados automáticamente.
- **Configuración centralizada** con `@nestjs/config` y `ConfigService`.
- **Capa común** con decoradores (`@CurrentUser`, `@Roles`), guards y utilidades de detección de tipos.
- **Seguridad production-ready**: CORS configurado por entorno, credenciales solo por variables de entorno.

### Requisitos

- Node.js >= 18
- Dos proyectos Supabase separados (uno para auth/users, otro para datos)
- Variables de entorno configuradas (ver `.env.example`)

### Variables de entorno

Duplicar `.env.example` como `.env` y ajustar valores:

```bash
# Base de datos principal (auth/users)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Base de datos de datos (issues/inventory/datasets)
SUPABASE_DATA_URL=https://your-data-project.supabase.co
SUPABASE_DATA_ANON_KEY=your-data-anon-key-here
SUPABASE_DATA_SERVICE_ROLE_KEY=your-data-service-role-key-here

# JWT y seguridad
JWT_SECRET=your-jwt-secret-here
CORS_ORIGINS=https://your-frontend.com,http://localhost:3000

# Configuración de aplicación
NODE_ENV=production
PORT=3000
```

> **Importante**: Nunca incluyas credenciales reales en el código. Todas las configuraciones sensibles deben venir de variables de entorno.

### Sincronización de Usuarios

El sistema utiliza **dos bases de datos Supabase separadas** para mantener la separación entre autenticación y datos operativos. La sincronización automática de usuarios asegura que:

- Los usuarios se crean primero en la base principal (auth)
- Al crear issues o acceder a datos, se sincronizan automáticamente a la base de datos
- Las foreign keys entre `issues.createdById` y `users.id` funcionan correctamente
- La consistencia se mantiene sin foreign keys entre proyectos Supabase

### Seguridad Production-Ready

- **CORS configurado por entorno**: Solo origenes específicos permitidos
- **Credenciales solo por variables de entorno**: No hay valores por defecto en código
- **JWT basado en email**: Validación robusta de identidad de usuario
- **Logging estructurado**: Seguimiento de operaciones críticas

### Instalación

```bash
npm install
```

### Scripts útiles

```bash
npm run start:dev   # modo desarrollo con hot-reload
npm run lint        # corre ESLint
npm run test        # unit tests
npm run test:e2e    # pruebas end-to-end con Supertest
npm run build       # genera artefactos en dist/
```

### Arquitectura de módulos

- `AuthModule`: registro, login, estrategia JWT, guardias y endpoints `/auth`.
- `UsersModule`: CRUD básico de usuarios con roles y hashing de contraseñas.
- `DatasetsModule`: endpoints `/datasets`, servicio de análisis automático y almacenamiento de previews.
- `DashboardsModule`: CRUD de dashboards guardados y verificación de ownership.
- `Common`: decoradores, guards, DTOs reutilizables y utilidades.

### Endpoints destacados

- `POST /api/auth/login` · Inicio de sesión (JWT)
- `POST /api/auth/register` · Alta de usuario y sesión inmediata
- `POST /api/datasets/upload` · Subida de CSV/XLSX, análisis y persistencia
- `GET /api/datasets` · Listado de datasets del usuario
- `POST /api/dashboards` · Guardar dashboards personalizados
- `GET /api/health` · Health check simple del servicio

### Cuentas de Producción

Al iniciar la aplicación, se crean automáticamente las siguientes cuentas de usuario fijas:

- **Super Admin**: `superadmin@datapulse.local` / `SuperAdmin2024!`
  - Tiene acceso completo a todas las funcionalidades del sistema
- **Admin**: `admin@datapulse.local` / `Admin2024!`
  - Tiene permisos administrativos pero limitados comparado con el super admin

> **Nota**: Estas cuentas se crean automáticamente al iniciar el backend por primera vez. Si ya existen, no se modifican.

- Administrador: `demo.admin@datapulse.local` · contraseña `DemoAdmin123!`
- Superadmin: `demo.superadmin@datapulse.local` · contraseña `DemoRoot123!`

Estas cuentas se crean en el arranque del backend y se omite su siembra si ya existen. Elimina o deshabilita estas credenciales antes de cualquier despliegue real.

### Tests

Los tests unitarios cubren controladores y servicios clave. Los e2e validan el health check base; extiéndelos para cubrir flujos auth/datasets cuando conectes la base real. Si inicias un nuevo proyecto de Supabase, limpia cualquier dato previo desde el panel (`Table editor` → `Delete data`) antes de importar tus tablas para mantener el entorno despejado. Recuerda definir tanto las credenciales primarias (`SUPABASE_*`) para usuarios/autenticación como las de datasets (`SUPABASE_DATA_*`) si deseas separar ambas bases.

### Despliegue sugerido

La aplicación está lista para ejecutarse en **Railway** o cualquier plataforma Node. Recuerda configurar variables de entorno, proteger las claves de servicio de Supabase y revisar límites de tamaño en Multer según tus necesidades.
