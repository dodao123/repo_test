# Stage 1: Build stage
FROM oven/bun:alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (allow lockfile updates for new packages)
RUN bun install

# Copy source code
COPY . .

# Build TypeScript code
RUN bun run build

# Stage 2: Production stage
FROM oven/bun:alpine

WORKDIR /app

  # Copy only package.json (not package-lock.json to avoid lockfile migration issues)
COPY package.json ./

# Install only production dependencies
# Bun will create its own lockfile without migration issues
RUN bun install --production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check for AKS
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["bun", "run", "dist/index.js"]
