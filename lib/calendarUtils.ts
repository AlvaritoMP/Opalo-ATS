// Utilidades para generar archivos de calendario (.ics) y enviar invitaciones

/**
 * Genera un archivo .ics (iCalendar) para agregar el evento al calendario
 */
export const generateICSFile = (
  title: string,
  description: string,
  start: Date,
  end: Date,
  location: string = '',
  attendeeEmails: string[] = []
): string => {
  // Formatear fechas en formato iCalendar (YYYYMMDDTHHmmssZ)
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // Generar UID único
  const uid = `${Date.now()}-${Math.random().toString(36).substring(7)}@ats-pro.local`;

  // Construir contenido del archivo .ics
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ATS Pro//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${escapeICSValue(title)}`,
    `DESCRIPTION:${escapeICSValue(description)}`,
    location ? `LOCATION:${escapeICSValue(location)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
  ];

  // Agregar asistentes (ATTENDEE)
  attendeeEmails.forEach(email => {
    if (email.trim()) {
      icsContent.push(`ATTENDEE;CN=${escapeICSValue(email)};RSVP=TRUE:mailto:${email.trim()}`);
    }
  });

  icsContent.push(
    'END:VEVENT',
    'END:VCALENDAR'
  );

  // Filtrar líneas vacías y unir
  return icsContent.filter(line => line !== '').join('\r\n');
};

/**
 * Escapa valores para formato iCalendar
 */
const escapeICSValue = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
};

/**
 * Descarga un archivo .ics
 */
export const downloadICSFile = (
  title: string,
  description: string,
  start: Date,
  end: Date,
  location: string = '',
  attendeeEmails: string[] = []
): void => {
  const icsContent = generateICSFile(title, description, start, end, location, attendeeEmails);
  
  // Crear blob y descargar
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${start.toISOString().split('T')[0]}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Copia el contenido del .ics al portapapeles
 */
export const copyICSToClipboard = async (
  title: string,
  description: string,
  start: Date,
  end: Date,
  location: string = '',
  attendeeEmails: string[] = []
): Promise<boolean> => {
  try {
    const icsContent = generateICSFile(title, description, start, end, location, attendeeEmails);
    await navigator.clipboard.writeText(icsContent);
    return true;
  } catch (error) {
    console.error('Error copiando al portapapeles:', error);
    return false;
  }
};

/**
 * Genera un mailto link para enviar invitación por email
 * Nota: Esto abre el cliente de email del usuario
 * Incluye headers para que algunos clientes reconozcan el formato de calendario
 */
export const generateMailtoLink = (
  attendeeEmails: string[],
  subject: string,
  body: string
): string => {
  const emails = attendeeEmails.filter(email => email.trim()).join(',');
  const encodedSubject = encodeURIComponent(subject);
  // Codificar el cuerpo del email (incluye el contenido .ics)
  const encodedBody = encodeURIComponent(body);
  
  // Algunos clientes reconocen mejor con estos parámetros
  return `mailto:${emails}?subject=${encodedSubject}&body=${encodedBody}`;
};

/**
 * Simula el envío de emails (en producción esto se haría desde el backend)
 * IMPORTANTE: mailto: NO puede crear emails de tipo "invitación de calendario" automáticamente.
 * Para que funcione como invitación real, se necesita un backend que envíe el email con el .ics adjunto.
 */
export const sendEmailInvitations = async (
  attendeeEmails: string[],
  title: string,
  start: Date,
  end: Date,
  notes: string = '',
  candidateName: string = '',
  interviewerName: string = ''
): Promise<void> => {
  if (attendeeEmails.length === 0) {
    alert('No hay emails para enviar');
    return;
  }

  // Validar emails
  const validEmails = attendeeEmails.filter(email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  });

  if (validEmails.length === 0) {
    alert('Por favor ingresa al menos un email válido');
    return;
  }

  // Descargar el archivo .ics
  downloadICSFile(
    title,
    notes || `Entrevista con ${candidateName || 'candidato'}`,
    start,
    end,
    '',
    validEmails
  );

  // Copiar contenido del .ics al portapapeles como respaldo
  await copyICSToClipboard(
    title,
    notes || `Entrevista con ${candidateName || 'candidato'}`,
    start,
    end,
    '',
    validEmails
  );

  // Formatear fecha y hora
  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${start.toISOString().split('T')[0]}.ics`;

  // Crear cuerpo del email con instrucciones claras
  const emailBody = `Hola,

Te invitamos a la siguiente entrevista:

Título: ${title}
Fecha y Hora: ${formatDateTime(start)} - ${formatDateTime(end)}
${candidateName ? `Candidato: ${candidateName}` : ''}
${interviewerName ? `Entrevistador: ${interviewerName}` : ''}
${notes ? `\nNotas:\n${notes}` : ''}

Por favor confirma tu asistencia.

---
📎 INSTRUCCIONES PARA ADJUNTAR LA INVITACIÓN DE CALENDARIO:

1. El archivo .ics ya se descargó automáticamente en tu carpeta de Descargas
2. Nombre del archivo: ${fileName}
3. En tu cliente de email, haz clic en "Adjuntar archivo" o "Attach"
4. Busca y selecciona el archivo ${fileName}
5. Envía el email

Los destinatarios podrán agregar el evento a su calendario haciendo doble clic en el archivo adjunto.

Saludos,
Equipo de Reclutamiento`;

  const subject = `Invitación: ${title}`;

  // Esperar un momento para que se complete la descarga antes de abrir el email
  setTimeout(() => {
    // Generar mailto link
    const mailtoLink = generateMailtoLink(validEmails, subject, emailBody);
    
    // Abrir cliente de email
    window.location.href = mailtoLink;
  }, 500);
  
  // Mostrar mensaje informativo con instrucciones
  alert(`📧 Se descargó el archivo .ics y se abrirá tu cliente de email.\n\n⚠️ IMPORTANTE - LIMITACIÓN ACTUAL:\n\nEl protocolo mailto: NO puede crear emails de tipo "invitación de calendario" automáticamente. Solo puede abrir tu cliente de email con el mensaje prellenado.\n\n📎 PARA ENVIAR LA INVITACIÓN DE CALENDARIO:\n\n1. El archivo .ics ya se descargó: ${fileName}\n2. También se copió al portapapeles como respaldo\n3. En tu cliente de email:\n   - Adjunta el archivo ${fileName} desde tu carpeta de Descargas\n   - O pega el contenido del .ics si tu cliente lo permite\n4. Los destinatarios podrán agregar el evento haciendo doble clic en el archivo adjunto\n\n💡 SOLUCIÓN COMPLETA:\nPara enviar invitaciones automáticamente como "reunión de calendario", se necesita un backend que envíe el email con el .ics adjunto usando un servicio SMTP (SendGrid, Resend, etc.).`);
};

