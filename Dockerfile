FROM node:22-alpine
RUN apk add ffmpeg

COPY . /app
WORKDIR /app

EXPOSE 3000

CMD ["yarn", "start:prod"]