# 🔍 Verificar Header Apikey Exacto

## 🎯 Objetivo

Verificar que el valor del header `apikey` en Network tab sea **exactamente igual** a la clave anon key de Supabase, carácter por carácter.

---

## ✅ Pasos para Verificar

### Paso 1: Obtener Clave de Supabase

1. Ve a Supabase Dashboard → Settings → API
2. Copia la clave **anon** completa
3. Guárdala en un archivo de texto temporal para comparar

### Paso 2: Verificar en Network Tab

1. Abre la app en producción
2. Abre DevTools → Network
3. Recarga la página
4. Haz clic en un request a Supabase (por ejemplo, `users`)
5. Ve a la pestaña **Headers**
6. En **Request Headers**, busca `apikey`
7. **Copia el valor completo** del header `apikey`

### Paso 3: Comparar Carácter por Carácter

Compara el valor del header `apikey` con la clave de Supabase:

1. **Longitud**: ¿Tienen la misma longitud?
2. **Inicio**: ¿Ambas empiezan con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`?
3. **Final**: ¿Ambas terminan igual?
4. **Caracteres especiales**: ¿Hay espacios, saltos de línea, o caracteres raros?

---

## 🐛 Problemas Comunes

### Problema 1: Espacios Extra

El header puede tener espacios al inicio o final:
```
apikey:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (con espacios)
```

**Solución**: Asegúrate de que no haya espacios en el valor en EasyPanel.

### Problema 2: Clave Truncada

El header puede estar truncado en la visualización, pero el valor completo está ahí.

**Solución**: Haz clic derecho en el valor del header → "Copy value" para copiarlo completo.

### Problema 3: Múltiples Proyectos de Supabase

Puede que estés usando la clave de un proyecto diferente.

**Solución**: Verifica que el proyecto en Supabase Dashboard sea el correcto (el que tiene los datos de Opalopy).

---

## 🔍 Verificación Adicional

### Verificar URL de Supabase

En Network tab, verifica que la URL sea:
```
https://afhiiplxqtodqxvmswor.supabase.co
```

Si es diferente, ese es el problema.

### Verificar Proyecto Correcto

1. Ve a Supabase Dashboard
2. Verifica que el proyecto sea el que tiene los datos de Opalopy
3. Verifica que la URL del proyecto sea `afhiiplxqtodqxvmswor.supabase.co`

---

## 📋 Checklist

- [ ] Clave anon key copiada de Supabase Dashboard
- [ ] Header `apikey` copiado de Network tab
- [ ] Comparadas carácter por carácter
- [ ] Verificada longitud (deben ser iguales)
- [ ] Verificado que no hay espacios extra
- [ ] Verificado que es el proyecto correcto de Supabase

---

## 🎯 Comparte el Resultado

Después de verificar, comparte:
1. ¿El header `apikey` tiene exactamente la misma longitud que la clave de Supabase?
2. ¿Empiezan igual? (primeros 20 caracteres)
3. ¿Terminan igual? (últimos 20 caracteres)
4. ¿Hay alguna diferencia visible?

Con esa información podré identificar el problema exacto.

