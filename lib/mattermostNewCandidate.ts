/**
 * Alerta de Mattermost al canal de Reclutamiento cuando llega un postulante por formulario.
 * Mantener alineado con supabase/functions/_shared/mattermostNewCandidate.ts
 */

export interface MattermostNewCandidateAlert {
  fullName: string
  position: string
  district: string
}

const DEFAULT_WEBHOOK_URL =
  'https://opalo-mattermost.bouasv.easypanel.host/hooks/q83cte9k17n3fyjxygm1my451e'

function escapeMd(value: string): string {
  return value.replace(/([\\*_`\[\]])/g, '\\$1')
}

function displayOrFallback(value: string | undefined, fallback: string): string {
  const trimmed = (value || '').trim()
  return escapeMd(trimmed || fallback)
}

export function composeCandidateFullName(candidate: {
  name?: string
  nombres?: string
  apellido_paterno?: string
  apellido_materno?: string
}): string {
  const fromParts = [candidate.nombres, candidate.apellido_paterno, candidate.apellido_materno]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return fromParts || (candidate.name || '').trim()
}

export function buildMattermostNewCandidatePayload(alert: MattermostNewCandidateAlert) {
  const fullName = displayOrFallback(alert.fullName, 'Sin nombre')
  return {
    username: 'ATS Bot',
    icon_url: 'https://img.icons8.com/fluency/96/resume.png',
    text: '### 🎯 Nuevo Postulante Registrado',
    attachments: [
      {
        color: '#1E88E5',
        fields: [
          { short: true, title: 'Candidato', value: `**${fullName}**` },
          {
            short: true,
            title: 'Puesto / Vacante',
            value: displayOrFallback(alert.position, 'Sin puesto'),
          },
          {
            short: true,
            title: 'Distrito',
            value: displayOrFallback(alert.district, 'No indicado'),
          },
        ],
      },
    ],
  }
}

export async function notifyMattermostNewCandidate(
  webhookUrl: string | undefined,
  alert: MattermostNewCandidateAlert,
): Promise<void> {
  const url = (webhookUrl || DEFAULT_WEBHOOK_URL).trim()
  if (!url) return

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildMattermostNewCandidatePayload(alert)),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('❌ Mattermost webhook falló:', response.status, body)
    }
  } catch (error) {
    console.error('❌ Error enviando alerta a Mattermost:', error)
  }
}
