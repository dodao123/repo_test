# Stage 1: Build stage with Bun
FROM oven/bun:alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build-time environment variables
# These can be passed during docker build: --build-arg VITE_API_URL=https://...
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN bun run build

# Stage 2: Production stage with Nginx
FROM nginx:stable-alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install wget for healthcheck
RUN apk add --no-cache wget

EXPOSE 80

# Health check for AKS
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
