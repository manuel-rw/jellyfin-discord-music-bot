import { INestApplication, Logger, LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'path';

import { AppModule } from './app.module';
import { ShardService } from './sharding/shard.service';

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
      Logger.warn(`failed to process log level ${process.env.LOG_LEVEL}`);
      return ['error', 'warn', 'log'];
  }
}

let app: INestApplication;

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Check if we're running as a shard worker (spawned by ShardingManager)
  // ShardingManager sets SHARD_ID and SHARD_COUNT environment variables
  if (
    process.env.SHARD_ID !== undefined &&
    process.env.SHARD_COUNT !== undefined
  ) {
    // This is a shard worker process, just start the app normally
    logger.log(
      `Starting as shard ${process.env.SHARD_ID}/${process.env.SHARD_COUNT}`,
    );
    app = await NestFactory.create(AppModule, {
      logger: getLoggingLevels(),
    });
    app.enableShutdownHooks();
    await app.listen(process.env.PORT || 3000);
    logger.log(
      `Shard ${process.env.SHARD_ID} listening on port ${process.env.PORT || 3000}`,
    );
    return;
  }

  // This is the main process, start the sharding manager
  logger.log('Starting as main sharding manager');
  app = await NestFactory.create(AppModule, {
    logger: getLoggingLevels(),
  });
  app.enableShutdownHooks();

  // Get the ShardService and initialize sharding
  const shardService = app.get(ShardService);
  shardService.initializeSharding();

  await app.listen(process.env.PORT || 3000);
  logger.log(
    `Main sharding manager listening on port ${process.env.PORT || 3000}`,
  );
}
bootstrap();
