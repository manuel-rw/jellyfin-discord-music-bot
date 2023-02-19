import { LogLevel } from '@nestjs/common/services';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

function getLoggingLevels(): LogLevel[] {
  if (process.env.DEBUG) {
    return ['log', 'error', 'warn', 'debug'];
  }

  return ['log', 'error', 'warn'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: getLoggingLevels(),
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
