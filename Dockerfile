FROM node:25-alpine
RUN apk add --no-cache ffmpeg=6.1.2-r2

COPY . /app
WORKDIR /app

EXPOSE 3000

CMD ["npm", "run", "start:prod"]