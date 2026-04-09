# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (backend)
COPY package*.json ./
RUN npm ci --production=false

# Install frontend dependencies
COPY client/package*.json client/
RUN npm ci --prefix client --production=false

# Copy source
COPY . .

# Build frontend
RUN npm run build:frontend

# Build backend
RUN npm run build:backend

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production-only deps
COPY package*.json ./
RUN npm ci --production

# Copy Prisma schema for runtime client generation
COPY prisma ./prisma
RUN npx prisma generate

# Copy compiled backend
COPY --from=builder /app/dist ./dist

# Copy built frontend
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 8091

ENV NODE_ENV=production
ENV PORT=8091

CMD ["node", "dist/server.js"]
