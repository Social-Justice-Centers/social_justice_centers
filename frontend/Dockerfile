FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy all source files and build
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

# We need next to run it, and standard setup needs package.json, node_modules, and .next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "start"]
