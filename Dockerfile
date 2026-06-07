FROM node:24-slim

ENV NODE_ENV=production
ENV PORT=4174
ENV RIAAYA_DB_PATH=/data/riaaya.sqlite
ENV RIAAYA_BACKUP_DIR=/data/backups

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

COPY . .
RUN npm run check

RUN mkdir -p /data /data/backups && chown -R node:node /app /data

USER node

EXPOSE 4174

CMD ["npm", "start"]
