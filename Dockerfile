# Railway Dockerfile for Next.js + MCP Servers

FROM node:20-slim

# Install Python and pipx for analytics-mcp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    pipx \
    && rm -rf /var/lib/apt/lists/*

# Configure pipx to install globally accessible binaries
ENV PIPX_HOME=/opt/pipx
ENV PIPX_BIN_DIR=/usr/local/bin
ENV PATH="/usr/local/bin:$PATH"

# Install analytics-mcp globally
RUN pipx install analytics-mcp

# Verify installation
RUN analytics-mcp --version

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci

# Copy application code
COPY . .

# Build Next.js application
RUN npm run build

# Create credentials directory
RUN mkdir -p /app/mcp-credentials && chmod 700 /app/mcp-credentials

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "start"]

