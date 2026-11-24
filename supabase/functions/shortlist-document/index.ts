// Descarga un adjunto del shortlist para quien ya ingresó con el DNI.
// El archivo sale de Google Drive con la conexión de la empresa y se entrega al navegador.
// No se comparte la carpeta ni un enlace público del archivo.
//
// Secretos de la función: GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET
// (los mismos del backend que renueva el token de Drive).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'Content-Disposition',
}

const APP_NAME = Deno.env.get('APP_NAME') || 'Opalo ATS'

const GOOGLE_APPS_EXPORT: Record<string, { mime: string; ext: string }> = {
  'application/vnd.google-apps.document': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: '.docx',
  },
  'application/vnd.google-apps.spreadsheet': {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: '.xlsx',
  },
  'application/vnd.google-apps.presentation': { mime: 'application/pdf', ext: '.pdf' },
  'application/vnd.google-apps.drawing': { mime: 'image/png', ext: '.png' },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeDni(value: unknown): string {
  return String(value || '').replace(/\D/g, '')
}

function driveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /\/drawings\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1] && !/\/folders\//.test(url)) return match[1]
  }
  return null
}

function asConfig(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
    } catch {
      return {}
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>
  return {}
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function contentDisposition(name: string): string {
  const cleaned = name.replace(/[\r\n"]/g, '').trim() || 'documento'
  const ascii = cleaned.replace(/[^\x20-\x7E]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || ''
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
  if (!clientId || !clientSecret) {
    throw new Error('La descarga de documentos no está lista en el servidor.')
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json().catch(() => ({}))
  const accessToken = textOf(data.access_token)
  if (!response.ok || !accessToken) {
    throw new Error('No se pudo usar la conexión de Google Drive. Vuelva a conectarla en Configuración.')
  }
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600
  return { accessToken, expiresIn }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) return json({ error: 'Server misconfigured' }, 500)

    const body = await req.json().catch(() => ({}))
    const token = textOf(body?.token)
    const dni = normalizeDni(body?.dni)
    const attachmentId = textOf(body?.attachmentId)
    if (!token || dni.length < 8 || !attachmentId) {
      return json({ error: 'Faltan datos para descargar el documento.' }, 400)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const roomQuery = await supabase
      .from('shortlists')
      .select('id, app_name, access_dni, status, show_documents')
      .eq('token', token)
      .maybeSingle()
    if (roomQuery.error) return json({ error: 'No se pudo abrir la sala.' }, 500)
    const room = roomQuery.data
    if (!room) return json({ error: 'Enlace no válido.' }, 404)
    if (room.status !== 'open') return json({ error: 'Esta sala ya no está disponible.' }, 403)
    if (normalizeDni(room.access_dni) !== dni) return json({ error: 'El DNI no corresponde a esta sala.' }, 403)
    if (room.show_documents === false) return json({ error: 'Los documentos no están habilitados en esta sala.' }, 403)

    const attachmentQuery = await supabase
      .from('attachments')
      .select('id, candidate_id, name, url, type')
      .eq('id', attachmentId)
      .maybeSingle()
    if (attachmentQuery.error) return json({ error: 'No se pudo leer el documento.' }, 500)
    const attachment = attachmentQuery.data
    const candidateId = textOf(attachment?.candidate_id)
    if (!attachment || !candidateId) return json({ error: 'Este archivo no está en la sala.' }, 404)

    const memberQuery = await supabase
      .from('shortlist_members')
      .select('id')
      .eq('shortlist_id', room.id)
      .eq('candidate_id', candidateId)
      .limit(1)
    if (memberQuery.error) return json({ error: 'No se pudo comprobar el candidato.' }, 500)
    if (!memberQuery.data?.length) return json({ error: 'Este archivo no está en la sala.' }, 403)

    const fileUrl = textOf(attachment.url)
    const fileId = driveFileId(fileUrl)
    if (!fileId) return json({ error: 'Este archivo no se puede descargar desde la sala.' }, 422)

    const appName = textOf(room.app_name) || APP_NAME
    const settingsQuery = await supabase
      .from('app_settings')
      .select('id, google_drive_config')
      .eq('app_name', appName)
      .maybeSingle()
    if (settingsQuery.error || !settingsQuery.data) {
      return json({ error: 'No se pudo usar la conexión de Google Drive. Vuelva a conectarla en Configuración.' }, 503)
    }

    const config = asConfig(settingsQuery.data.google_drive_config)
    const refreshToken = textOf(config.refreshToken) || textOf(config.refresh_token)
    let accessToken = textOf(config.accessToken) || textOf(config.access_token)
    const expiry = Date.parse(textOf(config.tokenExpiry) || textOf(config.token_expiry))
    const fresh = Boolean(accessToken) && Number.isFinite(expiry) && expiry > Date.now() + 60_000

    const renew = async () => {
      if (!refreshToken) {
        throw new Error('No se pudo usar la conexión de Google Drive. Vuelva a conectarla en Configuración.')
      }
      const refreshed = await refreshAccessToken(refreshToken)
      accessToken = refreshed.accessToken
      await supabase.from('app_settings').update({
        google_drive_config: {
          ...config,
          connected: true,
          accessToken,
          refreshToken,
          tokenExpiry: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
        },
      }).eq('id', settingsQuery.data.id)
      return accessToken
    }

    if (!fresh) accessToken = await renew()

    const downloaded = await downloadDriveFile(fileId, accessToken, renew, textOf(attachment.name) || 'documento')
    return new Response(downloaded.bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': downloaded.mime,
        'Content-Disposition': contentDisposition(downloaded.fileName),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo descargar el documento.'
    const status = message.includes('no está lista') ? 503 : 502
    return json({ error: message }, status)
  }
})

async function driveFetch(
  url: string,
  accessToken: string,
  renew: () => Promise<string>,
): Promise<{ response: Response; token: string }> {
  let token = accessToken
  let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (response.status === 401) {
    token = await renew()
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  }
  return { response, token }
}

async function downloadDriveFile(
  fileId: string,
  accessToken: string,
  renew: () => Promise<string>,
  fallbackName: string,
): Promise<{ bytes: Uint8Array; mime: string; fileName: string }> {
  const meta = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType&supportsAllDrives=true`,
    accessToken,
    renew,
  )
  if (!meta.response.ok) {
    throw new Error('No se pudo descargar el archivo. Vuelva a conectar Google Drive en Configuración.')
  }
  const info = await meta.response.json()
  const mimeType = textOf(info.mimeType)
  if (mimeType === 'application/vnd.google-apps.folder') {
    throw new Error('La carpeta de documentos no se comparte.')
  }
  const driveName = textOf(info.name) || fallbackName
  const exported = GOOGLE_APPS_EXPORT[mimeType]
  const url = exported
    ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exported.mime)}&supportsAllDrives=true`
    : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`
  const file = await driveFetch(url, meta.token, renew)
  if (!file.response.ok) {
    throw new Error('No se pudo descargar el archivo. Vuelva a conectar Google Drive en Configuración.')
  }
  let fileName = driveName
  if (exported && !fileName.toLowerCase().endsWith(exported.ext)) fileName += exported.ext
  const bytes = new Uint8Array(await file.response.arrayBuffer())
  const mime = file.response.headers.get('Content-Type') || exported?.mime || 'application/octet-stream'
  return { bytes, mime, fileName }
}
