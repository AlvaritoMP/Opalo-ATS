// types.ts

export type StageColorId =
    | 'blue'
    | 'green'
    | 'yellow'
    | 'orange'
    | 'red'
    | 'purple'
    | 'pink'
    | 'cyan'
    | 'indigo'
    | 'slate';

export interface Stage {
    id: string;
    name: string;
    requiredDocuments?: string[]; // IDs de categorías de documentos requeridas para avanzar a esta etapa
    isCritical?: boolean; // Indica si esta etapa es crítica y requiere atención
    color?: StageColorId; // Color para identificar la etapa en la tabla de alta densidad
}

export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    category?: string; // Categoría del documento (ej: "CV", "DNI", "Contrato", etc.)
    uploadedAt?: string; // Fecha de subida
}

export type ProcessStatus = 'en_proceso' | 'standby' | 'terminado';

export interface DocumentCategory {
    id: string;
    name: string;
    description?: string;
    required: boolean; // Si es requerido para el proceso
}

export interface Client {
    id: string;
    razonSocial: string;
    ruc: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Process {
    id: string;
    title: string;
    description: string;
    stages: Stage[];
    salaryRange?: string;
    experienceLevel?: string;
    seniority?: string;
    flyerUrl?: string;
    flyerPosition?: string; // Posición del background (ej: "50% 30%", "center top", etc.)
    attachments: Attachment[];
    serviceOrderCode?: string;
    startDate?: string;
    endDate?: string;
    status: ProcessStatus;
    vacancies: number;
    documentCategories?: DocumentCategory[]; // Categorías de documentos definidas para este proceso
    googleDriveFolderId?: string; // ID de la carpeta de Google Drive para este proceso
    googleDriveFolderName?: string; // Nombre de la carpeta (para mostrar)
    publishedDate?: string; // Fecha de publicación de la oferta (para Time to Hire)
    needIdentifiedDate?: string; // Fecha de identificación de necesidad (para Time to Fill)
    clientId?: string; // ID del cliente al que pertenece el proceso
    client?: Client; // Información del cliente (opcional, para cuando se carga con JOIN)
    isBulkProcess?: boolean; // Indica si es un proceso masivo (se gestiona en Procesos Masivos, no en Procesos normal)
    bulkConfig?: BulkProcessConfig; // Configuración específica para procesos masivos
    hiredCandidateIds?: string[]; // IDs de candidatos contratados al cerrar el proceso
    closedAt?: string; // Fecha y hora en que se cerró el proceso
}

/** Cómo usa el informe psicolaboral el valor de la columna al armar “Nombre y apellidos” (si no se indica, se infiere del encabezado). */
export type PsycholaboralReportNamePart =
    | 'given_names'
    | 'paternal_surname'
    | 'maternal_surname'
    | 'surnames_combined';

// Columna personalizada para la tabla de alta densidad en procesos masivos
export interface CustomColumn {
    id: string;
    name: string;
    type: 'text' | 'number' | 'checkbox' | 'date' | 'select';
    options?: string[];
    /** Marca explícita para el PDF psicolaboral (opcional). */
    reportNamePart?: PsycholaboralReportNamePart;
}

// --- Informes psicolaborales ---

export type IntellectualLevelId =
    | 'inferior'
    | 'normal_inferior'
    | 'normal_promedio'
    | 'normal_superior'
    | 'superior';

export type PersonalityLevel = 'bajo' | 'promedio' | 'alto';

export type PsycholaboralSuitability = 'apto' | 'no_apto' | 'apto_reservas';

export interface IntellectualLevelDefinition {
    id: IntellectualLevelId;
    name: string;
    scoreRange: string;
    interpretation: string;
}

export interface PersonalityTraitDefinition {
    id: string;
    name: string;
    definition: string;
}

export interface PsycholaboralCompetency {
    id: string;
    name: string;
    definition: string;
    expectedScore: number;
}

export interface PsycholaboralCompetencySet {
    id: string;
    name: string;
    competencies: PsycholaboralCompetency[];
}

export interface ConclusionTemplate {
    id: string;
    name: string;
    template: string;
}

export interface PsycholaboralInventory {
    intellectualLevels: IntellectualLevelDefinition[];
    personalityTraits: PersonalityTraitDefinition[];
    competencySets: PsycholaboralCompetencySet[];
    conclusionTemplates: ConclusionTemplate[];
}

export interface PsycholaboralProcessConfig {
    enabled?: boolean;
    competencySetId?: string;
    competencies?: PsycholaboralCompetency[];
    defaultPositionTitle?: string;
    defaultConclusionTemplateId?: string;
}

export interface PsycholaboralPersonalityRating {
    traitId: string;
    level: PersonalityLevel;
    observations: string;
}

export interface PsycholaboralCompetencyRating {
    competencyId: string;
    obtainedScore: number;
    observations: string;
}

export interface PsycholaboralEvaluation {
    intellectualLevelId: IntellectualLevelId;
    intellectualScore?: number;
    personality: PsycholaboralPersonalityRating[];
    competencies: PsycholaboralCompetencyRating[];
    conclusions: string;
    suitabilityStatus?: PsycholaboralSuitability;
    reportDate?: string;
    evaluatedAt?: string;
    positionApplied?: string;
}

// Configuración para procesos masivos
export interface BulkProcessConfig {
    killerQuestions?: KillerQuestion[]; // Preguntas automáticas que filtran candidatos
    aiPrompt?: string; // Prompt específico para OpenAI al analizar CVs
    scoreThreshold?: number; // Score mínimo (0-100) para que un candidato aparezca en la vista principal
    whatsappEnabled?: boolean; // Habilitar acceso rápido a WhatsApp
    whatsappMessageTemplate?: string; // Plantilla de mensaje para WhatsApp
    autoFilterEnabled?: boolean; // Activar filtrado automático basado en killer questions y score
    customColumns?: CustomColumn[]; // Columnas personalizadas para la tabla de alta densidad
    hiddenColumns?: string[]; // IDs de columnas ocultas
    columnOrder?: string[]; // Orden de columnas (base + custom_*)
    pinnedColumns?: string[]; // Columnas inmovilizadas al hacer scroll horizontal
    /** Anchos de columna en px (id de columna → ancho). Persistido por proceso. */
    columnWidths?: Record<string, number>;
    /** Colores de etapas por ID (respaldo en JSON del proceso masivo) */
    stageColors?: Record<string, StageColorId>;
    /** Colores de etapas por nombre (respaldo si cambian los IDs) */
    stageColorsByName?: Record<string, StageColorId>;
    /** ID de columna personalizada → nombre (para resolver valores guardados con IDs antiguos) */
    columnKeyAliases?: Record<string, string>;
    psycholaboral?: PsycholaboralProcessConfig;
}

// Pregunta "killer" para filtrado automático en procesos masivos
export interface KillerQuestion {
    id: string;
    question: string; // Texto de la pregunta
    type: 'yes_no' | 'multiple_choice'; // Tipo de pregunta
    options?: string[]; // Opciones para multiple_choice
    correctAnswer: string | string[]; // Respuesta(s) correcta(s) que permiten pasar el filtro
    required: boolean; // Si es requerida para pasar
}

export interface CandidateHistory {
    stageId: string;
    movedAt: string;
    movedBy: string;
}

export type CandidateSource = 'LinkedIn' | 'Referral' | 'Website' | 'Other' | string; // Permite strings personalizados desde configuración

export interface PostIt {
    id: string;
    text: string;
    color: 'yellow' | 'pink' | 'blue' | 'green' | 'orange';
    createdBy: string; // userId
    createdAt: string; // ISO date string
}

export interface Comment {
    id: string;
    text: string;
    userId: string; // userId del usuario que hizo el comentario
    createdAt: string; // ISO date string
    attachments?: Attachment[]; // Fotos o capturas de pantalla
}

export interface Candidate {
    id: string;
    name: string;
    email: string;
    phone?: string;
    phone2?: string; // Segundo número de teléfono
    processId: string;
    stageId: string;
    description?: string;
    history: CandidateHistory[];
    avatarUrl?: string;
    attachments: Attachment[];
    source?: CandidateSource | string;
    salaryExpectation?: string;
    agreedSalary?: string; // Salario acordado con el candidato
    agreedSalaryInWords?: string; // Salario acordado en letras (generado automáticamente)
    age?: number;
    dni?: string;
    linkedinUrl?: string;
    address?: string;
    province?: string; // Provincia del candidato
    district?: string; // Distrito del candidato
    postIts?: PostIt[]; // Post-its para el board
    comments?: Comment[]; // Comentarios/chat sobre el candidato
    archived?: boolean;
    archivedAt?: string;
    discarded?: boolean; // Si el candidato fue descartado del proceso
    discardReason?: string; // Motivo del descarte
    discardedAt?: string; // Fecha de descarte
    hireDate?: string;
    googleDriveFolderId?: string; // Carpeta del candidato en Google Drive (dentro de la carpeta del proceso)
    googleDriveFolderName?: string; // Nombre de la carpeta del candidato
    visibleToClients?: boolean; // Si es visible para usuarios tipo cliente/viewer
    offerAcceptedDate?: string; // Fecha de aceptación de oferta (para Time to Hire)
    applicationStartedDate?: string; // Fecha de inicio de solicitud (para Application Completion Rate)
    applicationCompletedDate?: string; // Fecha de finalización de solicitud (para Application Completion Rate)
    criticalStageReviewedAt?: string; // Fecha en que un usuario revisó el candidato en etapa crítica (para ocultar alertas)
    metadataIa?: string; // Resumen/metadata generado por IA (OpenAI)
    scoreIa?: number; // Score/puntuación generado por IA
    psycholaboralEvaluation?: PsycholaboralEvaluation;
}

export type UserRole = 'admin' | 'recruiter' | 'client' | 'viewer';

// Sistema de permisos por categorías
export type Permission = 
    // Procesos
    | 'processes.view' | 'processes.create' | 'processes.edit' | 'processes.delete'
    // Candidatos
    | 'candidates.view' | 'candidates.create' | 'candidates.edit' | 'candidates.delete' | 'candidates.archive' | 'candidates.export'
    // Calendario
    | 'calendar.view' | 'calendar.create' | 'calendar.edit' | 'calendar.delete'
    // Reportes
    | 'reports.view' | 'reports.export'
    // Usuarios
    | 'users.view' | 'users.create' | 'users.edit' | 'users.delete'
    // Configuración
    | 'settings.view' | 'settings.edit'
    // Cartas/Documentos
    | 'letters.view' | 'letters.create' | 'letters.download'
    // Comparador
    | 'comparator.view' | 'comparator.export'
    // Formularios
    | 'forms.view' | 'forms.edit';

export interface PermissionCategory {
    id: string;
    name: string;
    description?: string;
    permissions: Permission[];
}

export type WorkerHandoffPackageStatus =
    | 'sent'
    | 'received'
    | 'processing'
    | 'completed'
    | 'rejected'
    | 'partially_completed';

export type WorkerHandoffItemStatus = 'pending' | 'accepted' | 'rejected' | 'assigned';

export interface WorkerSnapshotIdentity {
    fullName?: string;
    dni?: string;
    email?: string;
    phone?: string;
    phone2?: string;
}

export interface WorkerSnapshot {
    identity: WorkerSnapshotIdentity;
    fields: Record<string, string | number | boolean>;
    meta: {
        sourceCandidateId: string;
        sourceProcessId: string;
        sourceApp: string;
        snapshotVersion: number;
        includedFieldKeys: string[];
        capturedAt: string;
    };
}

export type WorkerHandoffDeliveryStatus = 'pending' | 'delivered' | 'failed';

export interface WorkerHandoffPackage {
    id: string;
    sourceApp: string;
    targetApp: string;
    status: WorkerHandoffPackageStatus;
    workerCount: number;
    senderNote?: string;
    createdBy?: string;
    createdByName?: string;
    sentAt: string;
    receivedAt?: string;
    completedAt?: string;
    receiverNote?: string;
    payloadVersion: number;
    deliveryStatus?: WorkerHandoffDeliveryStatus;
    opsflowPackageId?: string;
    deliveryError?: string;
    deliveredAt?: string;
    createdAt: string;
    updatedAt: string;
    items?: WorkerHandoffItem[];
}

export interface WorkerHandoffItem {
    id: string;
    packageId: string;
    sourceCandidateId: string;
    sourceProcessId?: string;
    workerName: string;
    workerSnapshot: WorkerSnapshot;
    itemStatus: WorkerHandoffItemStatus;
    createdAt: string;
}

export interface CandidateHandoffHistoryEntry {
    itemId: string;
    packageId: string;
    sentAt: string;
    deliveryStatus?: WorkerHandoffDeliveryStatus;
    createdByName?: string;
    senderNote?: string;
    opsflowPackageId?: string;
    deliveryError?: string;
}

export type Section = 
    | 'dashboard' 
    | 'processes' 
    | 'archived' 
    | 'candidates' 
    | 'forms' 
    | 'letters' 
    | 'calendar' 
    | 'reports' 
    | 'compare' 
    | 'bulk-import' 
    | 'bulk-processes'
    | 'opsflow-handoffs'
    | 'users' 
    | 'settings';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    password?: string;
    avatarUrl?: string;
    permissions?: Permission[]; // Permisos personalizados (sobrescribe los del rol)
    visibleSections?: Section[]; // Secciones visibles en el menú (si no se define, usa las del rol por defecto)
    allowedClientIds?: string[] | null; // IDs de clientes a los que el usuario tiene acceso (null o undefined = acceso a todos si su rol/permisos lo permiten)
}

// Basic definitions for unused types to satisfy compiler
export interface Form {
    id: string;
    name: string;
}

export interface Application {
    id: string;
    candidateId: string;
    processId: string;
}

export interface GoogleDriveConfig {
    connected: boolean;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: string;
    userEmail?: string;
    userName?: string;
    rootFolderId?: string; // Carpeta raíz en Google Drive (puede ser "Opalo ATS" o cualquier otra)
    rootFolderName?: string; // Nombre de la carpeta raíz
}

export interface AppSettings {
    database: {
        apiUrl: string;
        apiToken: string;
    };
    fileStorage: {
        provider: string;
        connected: boolean;
    };
    googleDrive?: GoogleDriveConfig;
    currencySymbol: string;
    appName: string;
    logoUrl: string;
    poweredByLogoUrl?: string; // Logo para mostrar en el footer del sidebar con "POWERED BY"
    customLabels: { [key: string]: string };
    dashboardLayout?: string[]; // orden de widgets del dashboard
    templates?: { id: string; name: string; docxBase64: string }[]; // plantillas DOCX guardadas
    reportTheme?: {
        primaryColor?: string; // hex
        accentColor?: string;  // hex
        coverTitle?: string;
        footerText?: string;
        /** Imagen de portada del PDF psicolaboral (URL o data URL). Si no hay, se usa la imagen del proceso masivo o una predeterminada. */
        psycholaboralHeroImageUrl?: string | null;
        /** Texto breve bajo el título del informe (invita a leer; editable en Configuración). */
        psycholaboralIntroText?: string | null;
        /** Frase de cierre del PDF psicolaboral (antes del pie legal). */
        psycholaboralClosingText?: string | null;
    };
    candidateSources?: string[]; // Opciones configurables para el campo "fuentes" de candidatos
    provinces?: string[]; // Opciones configurables para el campo "provincia" de candidatos
    districts?: { [province: string]: string[] }; // Opciones configurables para el campo "distrito" de candidatos, organizadas por provincia
    psycholaboralInventory?: PsycholaboralInventory;
}

export interface FormIntegration {
    id: string;
    platform: 'Tally' | 'Google Forms' | 'Microsoft Forms' | string;
    formName: string;
    formIdOrUrl: string;
    processId: string;
    webhookUrl: string;
    fieldMapping?: FieldMapping; // Mapeo personalizado de campos
}

// Mapeo de campos: campo de Tally -> campo del candidato
export interface FieldMapping {
    // Campo en Tally (key o label) -> Campo en el candidato
    [tallyField: string]: string;
}

export interface InterviewEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    candidateId: string;
    interviewerId: string;
    notes?: string;
    attendeeEmails?: string[]; // Emails de los asistentes a la reunión
}