# syntax=docker/dockerfile:1

# ---------- Base dependencies ----------
FROM node:20-bullseye AS base

# Install Python and pipx for GA4 MCP server (analytics-mcp)
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv python3-distutils python3-full \
  && python3 -m pip install --upgrade pip \
  && python3 -m pip install pipx \
  && python3 -m pipx ensurepath \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:/root/.local/bin:${PATH}" \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci

# Install GA4 analytics-mcp via pipx in the image so runtime can exec it
RUN pipx install analytics-mcp

# ---------- Build ----------
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js
RUN npm run build

# ---------- Runtime (minimal) ----------
FROM node:20-bullseye AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Ensure Python is available at runtime for analytics-mcp
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends python3 \
  && rm -rf /var/lib/apt/lists/*

# Copy built app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json package-lock.json* ./

# Install only production deps for runtime
RUN npm ci --omit=dev

# Copy pipx environment binaries for analytics-mcp
COPY --from=deps /root/.local /root/.local

# Create non-root user
RUN useradd -m nextjs \
  && chown -R nextjs:nextjs /app \
  && chown -R nextjs:nextjs /root/.local

USER nextjs

# Expose Railway default port
EXPOSE 3000

# Next.js requires PORT env; Railway sets PORT dynamically
ENV PORT=3000

# Start Next.js server
CMD ["npm", "start"]


