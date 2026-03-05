# Guía de Integración con Tally

Esta guía explica cómo configurar la integración automática entre formularios de Tally y tu ATS para que los candidatos se agreguen automáticamente cuando completen un formulario.

## 📋 Requisitos Previos

1. Tener acceso a tu formulario en Tally
2. Tener un proceso de selección creado en el ATS
3. Tener un backend/servidor que pueda recibir webhooks (ver sección de Backend)

## 🔧 Configuración en el ATS

### Paso 1: Crear la Integración

1. Ve a la sección **"Integraciones de formularios"** en el menú lateral
2. Haz clic en **"Nueva integración"**
3. Completa el formulario:
   - **Plataforma**: Selecciona "Tally"
   - **Nombre del formulario**: Un nombre descriptivo (ej: "Postulación Desarrollador Senior")
   - **URL del formulario**: Pega la URL pública de tu formulario de Tally (ej: `https://tally.so/r/xxxxx`)
   - **Vincular a proceso**: Selecciona el proceso de selección donde quieres que se agreguen los candidatos
4. Haz clic en **"Crear integración"**

### Paso 2: Copiar la URL del Webhook

Después de crear la integración, se te mostrará una URL de webhook única. **Copia esta URL** - la necesitarás para configurar Tally.

La URL tendrá el formato:
```
https://tu-dominio.com/api/webhooks/tally/[id-unico]
```

## 🔗 Configuración en Tally

### Paso 1: Acceder a la Configuración del Formulario

1. Abre tu formulario en Tally
2. Haz clic en **"Settings"** (Configuración)
3. Ve a la sección **"Integrations"** (Integraciones)

### Paso 2: Configurar el Webhook

1. Busca la opción **"Webhook"** en las integraciones disponibles
2. Haz clic en **"Add webhook"** o **"Configure webhook"**
3. Pega la URL del webhook que copiaste del ATS
4. Selecciona el evento: **"Form submission"** (Envío de formulario)
5. Guarda los cambios

### Paso 3: Mapear Campos del Formulario

Para que los datos se mapeen correctamente, asegúrate de que tu formulario de Tally tenga campos con nombres que coincidan con los campos del candidato:

**Campos recomendados en Tally:**
- `name` o `nombre` → Nombre del candidato
- `email` o `correo` → Email del candidato
- `phone` o `telefono` → Teléfono
- `phone2` o `telefono2` → Teléfono secundario (opcional)
- `description` o `descripcion` → Descripción/Notas
- `source` o `fuente` → Fuente del candidato
- `salaryExpectation` o `expectativa_salarial` → Expectativa salarial
- `dni` → DNI
- `linkedinUrl` o `linkedin` → URL de LinkedIn
- `address` o `direccion` → Dirección
- `province` o `provincia` → Provincia
- `district` o `distrito` → Distrito
- `age` → Edad

**Nota**: Los nombres de campos son flexibles - el sistema intentará mapear automáticamente variaciones comunes.

## 🖥️ Configuración del Backend

Para que los webhooks funcionen, necesitas un endpoint en tu backend que reciba y procese las solicitudes de Tally.

### Estructura del Webhook de Tally

Cuando alguien completa un formulario en Tally, se envía un POST a tu webhook con esta estructura:

```json
{
  "eventId": "evt_xxxxx",
  "eventType": "FORM_RESPONSE",
  "formId": "xxxxx",
  "formName": "Nombre del Formulario",
  "responseId": "resp_xxxxx",
  "submittedAt": "2024-01-15T10:30:00Z",
  "fields": [
    {
      "key": "name",
      "label": "Nombre completo",
      "type": "TEXT",
      "value": "Juan Pérez"
    },
    {
      "key": "email",
      "label": "Email",
      "type": "EMAIL",
      "value": "juan@example.com"
    },
    {
      "key": "phone",
      "label": "Teléfono",
      "type": "PHONE",
      "value": "+51987654321"
    }
  ]
}
```

### Ejemplo de Endpoint (Node.js/Express)

```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Usa service key para bypass RLS
);

// Endpoint para recibir webhooks de Tally
app.post('/api/webhooks/tally/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const tallyData = req.body;

    // 1. Buscar la integración por webhook URL
    const { data: integration, error: integrationError } = await supabase
      .from('form_integrations')
      .select('*')
      .eq('webhook_url', `${req.protocol}://${req.get('host')}${req.originalUrl}`)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      return res.status(404).json({ error: 'Integration not found' });
    }

    // 2. Obtener el proceso asociado
    const { data: process, error: processError } = await supabase
      .from('processes')
      .select('id, stages')
      .eq('id', integration.process_id)
      .eq('app_name', integration.app_name)
      .single();

    if (processError || !process || !process.stages || process.stages.length === 0) {
      console.error('Process not found or has no stages:', processError);
      return res.status(404).json({ error: 'Process not found' });
    }

    // 3. Mapear campos de Tally a candidato (usando el mapeo personalizado si existe)
    const candidateData = mapTallyToCandidate(tallyData, integration);

    // 4. Crear el candidato en Supabase
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        ...candidateData,
        process_id: integration.process_id,
        stage_id: process.stages[0].id,
        app_name: integration.app_name,
        source: integration.form_name || 'Tally',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (candidateError) {
      console.error('Error creating candidate:', candidateError);
      return res.status(500).json({ error: 'Failed to create candidate' });
    }

    // 5. Crear entrada en historial
    await supabase.from('candidate_history').insert({
      candidate_id: candidate.id,
      stage_id: process.stages[0].id,
      moved_at: new Date().toISOString(),
      moved_by: 'Tally Integration',
      app_name: integration.app_name,
    });

    console.log(`✅ Candidate created from Tally: ${candidate.id}`);
    res.status(200).json({ success: true, candidateId: candidate.id });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Función para mapear datos de Tally a formato de candidato
function mapTallyToCandidate(tallyData, integration) {
  const fields = {};
  
  // Convertir array de fields a objeto
  if (tallyData.fields && Array.isArray(tallyData.fields)) {
    tallyData.fields.forEach(field => {
      const key = field.key?.toLowerCase() || field.label?.toLowerCase() || '';
      fields[key] = field.value || '';
    });
  }

  // Obtener mapeo personalizado si existe
  const customMapping = integration.field_mapping || {};
  
  // Función helper para obtener valor de campo con mapeo personalizado
  const getFieldValue = (candidateFieldKey) => {
    // 1. Si hay mapeo personalizado, usarlo primero
    if (customMapping[candidateFieldKey]) {
      const mappedTallyField = customMapping[candidateFieldKey].toLowerCase();
      if (fields[mappedTallyField] !== undefined) {
        return fields[mappedTallyField];
      }
    }
    
    // 2. Intentar con nombres estándar
    const standardNames = getStandardFieldNames(candidateFieldKey);
    for (const name of standardNames) {
      if (fields[name] !== undefined) {
        return fields[name];
      }
    }
    
    return '';
  };

  // Mapear campos usando la función helper
  const candidate = {
    name: getFieldValue('name'),
    email: getFieldValue('email'),
    phone: getFieldValue('phone'),
    phone2: getFieldValue('phone2'),
    description: getFieldValue('description'),
    source: getFieldValue('source') || integration.form_name || 'Tally',
    salaryExpectation: getFieldValue('salaryExpectation'),
    dni: getFieldValue('dni'),
    linkedinUrl: getFieldValue('linkedinUrl'),
    address: getFieldValue('address'),
    province: getFieldValue('province'),
    district: getFieldValue('district'),
    age: getFieldValue('age') ? parseInt(getFieldValue('age')) : undefined,
    archived: false,
    discarded: false,
    visible_to_clients: false,
  };

  return candidate;
}

// Función helper para obtener nombres estándar de campos
function getStandardFieldNames(candidateFieldKey) {
  const mappings = {
    'name': ['name', 'nombre', 'nombre_completo', 'full_name', 'nombre completo'],
    'email': ['email', 'correo', 'e-mail', 'correo_electronico'],
    'phone': ['phone', 'telefono', 'teléfono', 'telefono_principal', 'teléfono principal'],
    'phone2': ['phone2', 'telefono2', 'teléfono2', 'telefono_secundario', 'teléfono secundario'],
    'description': ['description', 'descripcion', 'descripción', 'notas', 'comentarios'],
    'source': ['source', 'fuente', 'origen', 'como_se_entero', 'cómo se enteró'],
    'salaryExpectation': ['salaryexpectation', 'expectativa_salarial', 'expectativa salarial', 'salario_esperado'],
    'dni': ['dni', 'documento', 'documento_identidad', 'cedula', 'cédula'],
    'linkedinUrl': ['linkedinurl', 'linkedin', 'perfil_linkedin', 'url_linkedin'],
    'address': ['address', 'direccion', 'dirección', 'domicilio'],
    'province': ['province', 'provincia'],
    'district': ['district', 'distrito'],
    'age': ['age', 'edad'],
  };
  
  return mappings[candidateFieldKey] || [];
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
```

### Ejemplo de Endpoint (Python/Flask)

```python
from flask import Flask, request, jsonify
from supabase import create_client, Client
import os
from datetime import datetime

app = Flask(__name__)

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_SERVICE_KEY")
)

@app.route('/api/webhooks/tally/<webhook_id>', methods=['POST'])
def handle_tally_webhook(webhook_id):
    try:
        tally_data = request.json
        webhook_url = f"{request.scheme}://{request.host}{request.path}"

        # 1. Buscar la integración
        integration = supabase.table('form_integrations')\
            .select('*')\
            .eq('webhook_url', webhook_url)\
            .single()\
            .execute()

        if not integration.data:
            return jsonify({'error': 'Integration not found'}), 404

        # 2. Obtener el proceso
        process = supabase.table('processes')\
            .select('id, stages')\
            .eq('id', integration.data['process_id'])\
            .eq('app_name', integration.data['app_name'])\
            .single()\
            .execute()

        if not process.data or not process.data.get('stages'):
            return jsonify({'error': 'Process not found'}), 404

        # 3. Mapear datos (usando el mapeo personalizado si existe)
        candidate_data = map_tally_to_candidate(tally_data, integration.data)

        # 4. Crear candidato
        candidate = supabase.table('candidates')\
            .insert({
                **candidate_data,
                'process_id': integration.data['process_id'],
                'stage_id': process.data['stages'][0]['id'],
                'app_name': integration.data['app_name'],
                'source': integration.data['form_name'] or 'Tally',
                'created_at': datetime.utcnow().isoformat(),
            })\
            .execute()

        # 5. Crear historial
        supabase.table('candidate_history')\
            .insert({
                'candidate_id': candidate.data[0]['id'],
                'stage_id': process.data['stages'][0]['id'],
                'moved_at': datetime.utcnow().isoformat(),
                'moved_by': 'Tally Integration',
                'app_name': integration.data['app_name'],
            })\
            .execute()

        return jsonify({'success': True, 'candidateId': candidate.data[0]['id']})

    except Exception as e:
        print(f'Webhook error: {e}')
        return jsonify({'error': 'Internal server error'}), 500

def get_standard_field_names(candidate_field_key):
    """Retorna lista de nombres estándar para un campo del candidato"""
    mappings = {
        'name': ['name', 'nombre', 'nombre_completo', 'full_name', 'nombre completo'],
        'email': ['email', 'correo', 'e-mail', 'correo_electronico'],
        'phone': ['phone', 'telefono', 'teléfono', 'telefono_principal', 'teléfono principal'],
        'phone2': ['phone2', 'telefono2', 'teléfono2', 'telefono_secundario', 'teléfono secundario'],
        'description': ['description', 'descripcion', 'descripción', 'notas', 'comentarios'],
        'source': ['source', 'fuente', 'origen', 'como_se_entero', 'cómo se enteró'],
        'salaryExpectation': ['salaryexpectation', 'expectativa_salarial', 'expectativa salarial', 'salario_esperado'],
        'dni': ['dni', 'documento', 'documento_identidad', 'cedula', 'cédula'],
        'linkedinUrl': ['linkedinurl', 'linkedin', 'perfil_linkedin', 'url_linkedin'],
        'address': ['address', 'direccion', 'dirección', 'domicilio'],
        'province': ['province', 'provincia'],
        'district': ['district', 'distrito'],
        'age': ['age', 'edad'],
    }
    return mappings.get(candidate_field_key, [])

def get_field_value(fields, candidate_field_key, custom_mapping):
    """Obtiene el valor de un campo usando mapeo personalizado o nombres estándar"""
    # 1. Si hay mapeo personalizado, usarlo primero
    if custom_mapping and candidate_field_key in custom_mapping:
        mapped_tally_field = custom_mapping[candidate_field_key].lower()
        if mapped_tally_field in fields:
            return fields[mapped_tally_field]
    
    # 2. Intentar con nombres estándar
    standard_names = get_standard_field_names(candidate_field_key)
    for name in standard_names:
        if name in fields:
            return fields[name]
    
    return ''

def map_tally_to_candidate(tally_data, integration):
    fields = {}
    
    if 'fields' in tally_data and isinstance(tally_data['fields'], list):
        for field in tally_data['fields']:
            key = (field.get('key') or field.get('label') or '').lower()
            fields[key] = field.get('value', '')

    # Obtener mapeo personalizado si existe
    custom_mapping = integration.get('field_mapping') or {}

    return {
        'name': get_field_value(fields, 'name', custom_mapping),
        'email': get_field_value(fields, 'email', custom_mapping),
        'phone': get_field_value(fields, 'phone', custom_mapping),
        'phone2': get_field_value(fields, 'phone2', custom_mapping),
        'description': get_field_value(fields, 'description', custom_mapping),
        'source': get_field_value(fields, 'source', custom_mapping) or integration.get('form_name') or 'Tally',
        'salary_expectation': get_field_value(fields, 'salaryExpectation', custom_mapping),
        'dni': get_field_value(fields, 'dni', custom_mapping),
        'linkedin_url': get_field_value(fields, 'linkedinUrl', custom_mapping),
        'address': get_field_value(fields, 'address', custom_mapping),
        'province': get_field_value(fields, 'province', custom_mapping),
        'district': get_field_value(fields, 'district', custom_mapping),
        'age': int(get_field_value(fields, 'age', custom_mapping)) if get_field_value(fields, 'age', custom_mapping) and get_field_value(fields, 'age', custom_mapping).isdigit() else None,
        'archived': False,
        'discarded': False,
        'visible_to_clients': False,
    }

if __name__ == '__main__':
    app.run(port=int(os.environ.get('PORT', 3000)))
```

## ✅ Verificación

1. Completa un formulario de prueba en Tally
2. Verifica en el ATS que el candidato aparezca en el proceso asociado
3. Revisa los logs del backend para confirmar que el webhook se recibió correctamente

## 🗺️ Mapeo Personalizado de Campos

Si los nombres de tus campos en Tally son diferentes a los estándar, puedes configurar un mapeo personalizado directamente en el ATS.

### Cómo Configurar el Mapeo

1. Al crear o editar una integración, expande la sección **"Mapeo de campos personalizado"**
2. Para cada campo del candidato que quieras mapear, ingresa el nombre exacto del campo en Tally
3. El sistema usará primero tu mapeo personalizado, y si no encuentra el campo, intentará con los nombres estándar

### Ejemplo

Si en Tally tienes un campo llamado `"Nombre y Apellidos"` en lugar de `"name"`:
- En el campo **"Nombre"** del mapeo, ingresa: `Nombre y Apellidos`
- El sistema buscará ese campo en Tally y lo mapeará al campo `name` del candidato

### Uso en el Backend

El mapeo personalizado se guarda en `integration.field_mapping` como un objeto JSON:
```json
{
  "name": "Nombre y Apellidos",
  "email": "Correo Electrónico",
  "phone": "Teléfono de Contacto"
}
```

El código del backend ya está preparado para usar este mapeo automáticamente. Solo asegúrate de pasar el objeto `integration` completo a la función de mapeo.

## 🔍 Solución de Problemas

### El candidato no aparece en el ATS

1. **Verifica que el webhook esté configurado correctamente en Tally**
   - Revisa que la URL del webhook sea exactamente la misma que se muestra en el ATS
   - Verifica que el evento seleccionado sea "Form submission"

2. **Revisa los logs del backend**
   - Debe haber un log cuando se recibe el webhook
   - Busca errores en la creación del candidato

3. **Verifica los permisos de Supabase**
   - El backend debe usar una Service Key para crear candidatos
   - Verifica que las políticas RLS permitan la inserción

### Los campos no se mapean correctamente

1. **Revisa los nombres de los campos en Tally**
   - Asegúrate de que los nombres coincidan con los campos recomendados
   - El sistema es flexible pero funciona mejor con nombres estándar

2. **Verifica el formato de los datos**
   - Algunos campos requieren formatos específicos (ej: email, teléfono)
   - Revisa que los valores sean válidos

## 📝 Notas Adicionales

- Los candidatos se agregan automáticamente a la **primera etapa** del proceso asociado
- El campo `source` se establece automáticamente como el nombre del formulario
- Si un campo no se encuentra en el formulario de Tally, simplemente se omite (no causa error)
- Puedes tener múltiples integraciones de Tally vinculadas a diferentes procesos
