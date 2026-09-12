FROM node:24-alpine AS base

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

EXPOSE 5173

# Run Vite dev server with host 0.0.0.0 for Docker networking
CMD ["npm", "run", "dev"]

