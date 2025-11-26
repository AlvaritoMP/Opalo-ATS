# Instrucciones para Importación Masiva de Candidatos

## Formatos Soportados

Puedes importar candidatos desde archivos **CSV** o **Excel (.xlsx, .xls)**.

### Archivo CSV
El archivo CSV debe tener la primera fila como encabezados (headers) y las siguientes filas con los datos de cada candidato.

### Archivo Excel
El archivo Excel debe tener los encabezados en la primera fila de la primera hoja. Los nombres de las columnas pueden estar en español o inglés (ej: "nombre" o "name", "correo" o "email").

## Campos Disponibles

### Campos Obligatorios
- **name**: Nombre completo del candidato (requerido)
- **email**: Correo electrónico del candidato (requerido)

### Campos Opcionales

- **phone**: Teléfono del candidato
- **description**: Resumen o descripción del candidato
- **source**: Fuente del candidato (ej: "LinkedIn", "Referencia", "Sitio web", "Otro")
- **salaryExpectation**: Expectativa salarial (ej: "$50000", "50000", "S/. 50000")
- **agreedSalary**: Salario acordado con el candidato (ej: "$55000", "55000", "S/. 55000")
- **age**: Edad del candidato (número entero)
- **dni**: Documento Nacional de Identidad
- **linkedinUrl**: URL del perfil de LinkedIn
- **address**: Dirección o ciudad
- **province**: Provincia (debe coincidir exactamente con una provincia de la lista configurada)
- **district**: Distrito (debe coincidir exactamente con un distrito de la provincia seleccionada)

## Ejemplo de Archivo CSV

```csv
name,email,phone,description,source,salaryExpectation,agreedSalary,age,dni,linkedinUrl,address,province,district
Juan Pérez,juan.perez@email.com,987654321,Desarrollador Frontend con 5 años de experiencia,LinkedIn,$50000,$55000,30,12345678,https://linkedin.com/in/juanperez,Lima,LIMA,MIRAFLORES
María González,maria.gonzalez@email.com,987654322,Ingeniera de Software especializada en React,Referencia,$60000,,28,87654321,https://linkedin.com/in/mariagonzalez,Arequipa,AREQUIPA,YANAHUARA
Carlos Rodríguez,carlos.rodriguez@email.com,987654323,Diseñador UX/UI con experiencia en apps móviles,Sitio web,$45000,$48000,32,11223344,https://linkedin.com/in/carlosrodriguez,Cusco,CUSCO,CUSCO
```

## Notas Importantes

1. **Provincia y Distrito**: 
   - Los nombres deben coincidir EXACTAMENTE con los que están en la base de datos
   - Las provincias y distritos están en mayúsculas en el sistema
   - El distrito debe pertenecer a la provincia especificada

2. **Formato de Salarios**: 
   - Puedes usar cualquier formato: "$50000", "50000", "S/. 50000", "$50,000", etc.
   - El sistema almacenará el valor tal como lo ingreses

3. **Campos Vacíos**: 
   - Puedes dejar campos opcionales vacíos
   - Si un campo está vacío, simplemente deja la celda en blanco o escribe una coma

4. **Caracteres Especiales**: 
   - Si un campo contiene comas, debe estar entre comillas dobles
   - Ejemplo: `"Descripción, con comas"`

5. **Valores Faltantes**: 
   - Si falta un campo opcional, simplemente deja la celda vacía
   - Los únicos campos requeridos son: name y email

## Archivos de Plantilla

Dos archivos de plantilla están disponibles:
- **CSV**: `lib/plantilla-importacion-candidatos.csv`
- **Excel**: `lib/plantilla-importacion-candidatos.xlsx`

Puedes usar cualquiera de estos archivos como base y completarlo con tus datos. El archivo Excel es más fácil de editar en Excel o Google Sheets.

## Proceso de Importación

1. Ve a "Importación Masiva" en el menú lateral
2. Selecciona el proceso destino para los candidatos
3. Sube tu archivo CSV o Excel (.xlsx)
4. Haz clic en "Importar candidatos"
5. Verás el resultado de la importación (candidatos importados correctamente y los que fallaron)

## Errores Comunes

- **Falta nombre o email**: Los candidatos sin estos campos no se importarán
- **Provincia no encontrada**: Verifica que el nombre de la provincia coincida exactamente
- **Distrito no encontrado**: Verifica que el distrito pertenezca a la provincia especificada

