# --- 第一階段：編譯 Astro 專案 ---
FROM node:22-alpine AS builder
WORKDIR /app

# 🌟 新增：接收從外部傳入的 API 網址
ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- 第二階段：使用 Nginx 伺服器與反向代理 ---
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# 🌟 核心魔法：設定 Nginx，將 /api 開頭的請求全部轉發給後端容器
RUN echo 'server { \
    listen 4321; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:3000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 4321
CMD ["nginx", "-g", "daemon off;"]