# Stage 1: Build Angular app
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install -g @angular/cli && npm install

# Copy source
COPY . .

# Build Angular app
RUN ng build

