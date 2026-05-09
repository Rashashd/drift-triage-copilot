FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 3000
CMD ["npm", "run", "dev"]
