# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# IPv4 primero: en este VPS una ruta IPv6 deja la descarga colgada.
# Cada paquete espera como máximo 1 minuto y npm reintenta 2 veces.
# No repetir el install entero: eso convertía un corte de red en media hora de deploy.
ENV NODE_OPTIONS=--dns-result-order=ipv4first \
    NPM_CONFIG_FETCH_RETRIES=2 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=2000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=10000 \
    NPM_CONFIG_FETCH_TIMEOUT=60000 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_PROGRESS=false \
    NPM_CONFIG_LOGLEVEL=warn

# Copy package files
COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build arguments for environment variables (Vite needs them at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ARG GEMINI_API_KEY

# Set as environment variables for the build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Build the application
RUN npm run build

# Stage 2: Serve with nginx (Unprivileged image for Easypanel compatibility)
FROM nginxinc/nginx-unprivileged:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (unprivileged port)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
