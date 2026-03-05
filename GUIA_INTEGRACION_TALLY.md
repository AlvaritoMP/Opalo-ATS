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

    // 3. Mapear campos de Tally a candidato
    const candidateData = mapTallyToCandidate(tallyData, process.stages[0].id);

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
function mapTallyToCandidate(tallyData, firstStageId) {
  const fields = {};
  
  // Convertir array de fields a objeto
  if (tallyData.fields && Array.isArray(tallyData.fields)) {
    tallyData.fields.forEach(field => {
      const key = field.key?.toLowerCase() || field.label?.toLowerCase() || '';
      fields[key] = field.value || '';
    });
  }

  // Mapear campos comunes
  const candidate = {
    name: fields.name || fields.nombre || '',
    email: fields.email || fields.correo || '',
    phone: fields.phone || fields.telefono || '',
    phone2: fields.phone2 || fields.telefono2 || '',
    description: fields.description || fields.descripcion || '',
    source: fields.source || fields.fuente || 'Tally',
    salaryExpectation: fields.salaryexpectation || fields.expectativa_salarial || '',
    dni: fields.dni || '',
    linkedinUrl: fields.linkedinurl || fields.linkedin || '',
    address: fields.address || fields.direccion || '',
    province: fields.province || fields.provincia || '',
    district: fields.district || fields.distrito || '',
    age: fields.age ? parseInt(fields.age) : undefined,
    archived: false,
    discarded: false,
    visible_to_clients: false,
  };

  return candidate;
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

        # 3. Mapear datos
        candidate_data = map_tally_to_candidate(tally_data, process.data['stages'][0]['id'])

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

def map_tally_to_candidate(tally_data, first_stage_id):
    fields = {}
    
    if 'fields' in tally_data and isinstance(tally_data['fields'], list):
        for field in tally_data['fields']:
            key = (field.get('key') or field.get('label') or '').lower()
            fields[key] = field.get('value', '')

    return {
        'name': fields.get('name') or fields.get('nombre', ''),
        'email': fields.get('email') or fields.get('correo', ''),
        'phone': fields.get('phone') or fields.get('telefono', ''),
        'phone2': fields.get('phone2') or fields.get('telefono2', ''),
        'description': fields.get('description') or fields.get('descripcion', ''),
        'source': fields.get('source') or fields.get('fuente', 'Tally'),
        'salary_expectation': fields.get('salaryexpectation') or fields.get('expectativa_salarial', ''),
        'dni': fields.get('dni', ''),
        'linkedin_url': fields.get('linkedinurl') or fields.get('linkedin', ''),
        'address': fields.get('address') or fields.get('direccion', ''),
        'province': fields.get('province') or fields.get('provincia', ''),
        'district': fields.get('district') or fields.get('distrito', ''),
        'age': int(fields['age']) if fields.get('age') and fields['age'].isdigit() else None,
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
