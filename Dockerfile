FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy all project files
COPY . .

# Cloud Run expects PORT 8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
