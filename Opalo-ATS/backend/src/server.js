import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Permitir múltiples orígenes para que el mismo backend sirva a Opalopy y Opalo ATS
const allowedOrigins = [
    'http://localhost:3000',  // Opalopy desarrollo
    'http://localhost:3001',  // Opalo ATS desarrollo
    'http://localhost:5173',  // Vite por defecto
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_OPALOPY,
    process.env.FRONTEND_URL_OPALO_ATS,
].filter(Boolean); // Eliminar valores undefined/null

// Middleware CORS
app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (Postman, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS bloqueado para origen: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rutas
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'Opalo ATS Backend - Google Drive API'
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Iniciar servidor
// Escuchar en 0.0.0.0 para que sea accesible desde Caddy/proxy
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor backend corriendo en http://0.0.0.0:${PORT}`);
    console.log(`📡 Frontend URL: ${FRONTEND_URL}`);
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
    console.log(`🔐 Google OAuth Redirect URI: ${redirectUri}`);
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.log(`⚠️  ADVERTENCIA: GOOGLE_CLIENT_ID no está configurada. Google Drive no funcionará.`);
    }
    console.log(`\n✅ Backend listo para recibir peticiones`);
});
