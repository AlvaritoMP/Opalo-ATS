# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# El VPS corta descargas largas. IPv4 primero y reintentos con caché de npm.
ENV NODE_OPTIONS=--dns-result-order=ipv4first \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=180000 \
    NPM_CONFIG_MAXSOCKETS=3 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

# Copy package files
COPY package*.json ./

# Install dependencies. La caché sobrevive a un corte, así el reintento no empieza de cero.
RUN --mount=type=cache,target=/root/.npm \
    n=0; \
    until npm ci; do \
      n=$((n+1)); \
      if [ "$n" -ge 4 ]; then exit 1; fi; \
      echo "npm ci fallo, reintento ${n}"; \
      rm -rf node_modules; \
      sleep 20; \
    done

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
