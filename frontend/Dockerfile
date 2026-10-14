# Build from the frontend/ folder:  docker build --build-arg VITE_API_URL=https://api.example.com -t companywebsite-web .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
ARG VITE_API_URL=http://localhost:8082
ARG VITE_SITE_URL=http://localhost:8083
ENV VITE_API_URL=$VITE_API_URL VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
