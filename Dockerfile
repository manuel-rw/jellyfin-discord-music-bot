FROM node:24-alpine
RUN apk add ffmpeg

COPY . /app
WORKDIR /app

EXPOSE 3000

CMD ["yarn", "start:prod"]