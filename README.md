# Opalo ATS - Applicant Tracking System

Sistema de gestión de talento (Applicant Tracking System) para facilitar el proceso de reclutamiento y selección de personal.

## Características

- Gestión completa de procesos de reclutamiento
- Seguimiento de candidatos por etapas
- Integración con Google Drive para almacenamiento de archivos
- Calendario de entrevistas
- Generación de reportes
- Sistema de roles y permisos
- Integración con formularios externos (Tally, Google Forms, etc.)

## Requisitos Previos

- Node.js >= 20.0.0
- npm >= 10.0.0
- Una cuenta de Supabase (para la base de datos)
- Una cuenta de Google Cloud (para Google Drive, opcional)

## Instalación

1. Clona el repositorio:
   ```bash
   git clone <repository-url>
   cd Opalo-ATS
   ```

2. Instala las dependencias:
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   npm install
   cd ..
   ```

3. Configura las variables de entorno (ver [SETUP.md](SETUP.md) para más detalles):
   - Crea `.env.local` en la raíz del proyecto
   - Crea `.env` en la carpeta `backend/`

## Configuración Inicial

**IMPORTANTE**: Esta es una nueva instancia de Opalo ATS sin datos. Debes:

1. Crear tu propio proyecto en Supabase
2. Configurar las credenciales en `.env.local`
3. Configurar las credenciales de Google OAuth (opcional, para Google Drive)
4. La aplicación comenzará completamente vacía, sin procesos, candidatos ni usuarios

Para más detalles, consulta [SETUP.md](SETUP.md)

## Ejecutar en Desarrollo

**Frontend:**
```bash
npm run dev
```
El frontend estará disponible en `http://localhost:3000`

**Backend:**
```bash
cd backend
npm run dev
```
El backend estará disponible en `http://localhost:5000`

## Estructura del Proyecto

```
Opalo-ATS/
├── backend/          # Servidor Express para Google Drive API
├── components/       # Componentes React
├── lib/              # Utilidades y servicios
├── src/              # Código fuente principal
└── ...
```

## Documentación

- [SETUP.md](SETUP.md) - Guía de configuración inicial
- [MANUAL_USUARIO.md](MANUAL_USUARIO.md) - Manual de usuario
- [MANUAL_SUPER_ADMIN.md](MANUAL_SUPER_ADMIN.md) - Manual de administrador
