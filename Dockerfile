FROM node:26-alpine
RUN apk add --no-cache ffmpeg=8.1.2-r0

COPY . /app
WORKDIR /app

EXPOSE 3000

CMD ["npm", "run", "start:prod"]