# Crear el Primer Usuario Super Admin

Como la aplicación Opalo ATS inicia sin usuarios, necesitas crear el primer usuario Super Admin para poder acceder al sistema.

## Opción 1: Usando SQL en Supabase (Recomendado)

1. **Accede a tu proyecto de Supabase**
   - Ve a https://supabase.com
   - Selecciona tu proyecto
   - Ve a **SQL Editor** en el menú lateral

2. **Ejecuta el script SQL**
   - Abre el archivo `CREAR_PRIMER_USUARIO.sql`
   - **IMPORTANTE**: Antes de ejecutar, cambia:
     - `admin@opaloats.com` por el email que quieras usar
     - `admin123` por la contraseña que quieras usar
   - Copia y pega el contenido en el SQL Editor
   - Haz clic en **Run** (o presiona Ctrl+Enter)

3. **Verifica que se creó**
   - Deberías ver un mensaje de éxito
   - La consulta SELECT al final mostrará el usuario creado

4. **Inicia sesión**
   - Ve a http://localhost:3001
   - Usa el email y contraseña que configuraste

## Opción 2: Crear usuario desde la interfaz (Requiere acceso)

Si ya tienes acceso a la aplicación, puedes crear usuarios desde:
- Menú → **Usuarios** → **Nuevo Usuario**

## Credenciales por Defecto (si usas el script sin modificar)

⚠️ **NO RECOMENDADO PARA PRODUCCIÓN**

Si ejecutas el script sin modificar, las credenciales serían:
- **Email**: `admin@opaloats.com`
- **Password**: `admin123`

**Por favor, cambia estas credenciales antes de usar en producción.**

## Nota sobre Seguridad

Actualmente, las contraseñas se almacenan en texto plano en la base de datos. Para producción, se recomienda:
1. Implementar hash de contraseñas (bcrypt, argon2, etc.)
2. Usar autenticación de Supabase Auth en lugar de autenticación personalizada
3. Configurar políticas RLS apropiadas

