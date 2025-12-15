FROM node:25-alpine
RUN apk add --no-cache ffmpeg

COPY . /app
WORKDIR /app

EXPOSE 3000

CMD ["npm", "run", "start:prod"]