import { LogLevel } from '@nestjs/common/services';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

function getLoggingLevels(): LogLevel[] {
  if (!process.env.LOG_LEVEL) {
    return ['error', 'warn', 'log'];
  }

  switch (process.env.LOG_LEVEL.toLowerCase()) {
    case 'error':
      return ['error'];
    case 'warn':
      return ['error', 'warn'];
    case 'log':
      return ['error', 'warn', 'log'];
    case 'debug':
      return ['error', 'warn', 'log', 'debug'];
    case 'verbose':
      return ['error', 'warn', 'log', 'debug', 'verbose'];
    default:
      console.log(`failed to process log level ${process.env.LOG_LEVEL}`);
      return ['error', 'warn', 'log'];
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: getLoggingLevels(),
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
