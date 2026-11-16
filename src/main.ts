import {
  INestApplication,
  INestApplicationContext,
  Logger,
  LogLevel,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

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

/**
 * Whether this process was spawned by the discord.js ShardingManager.
 * ShardingManager sets SHARDING_MANAGER/SHARDS/SHARD_COUNT in the worker env.
 */
function isShardWorker(): boolean {
  return process.env.SHARDING_MANAGER !== undefined;
}

let app: INestApplication | INestApplicationContext;

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  if (isShardWorker()) {
    // Shard worker: run the app without an HTTP server. The main process owns
    // the port, so binding here would fail with EADDRINUSE.
    const shardId = process.env.SHARDS ?? 'unknown';
    const totalShards = process.env.SHARD_COUNT ?? 'unknown';
    logger.log(`Starting as shard worker ${shardId}/${totalShards}`);
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: getLoggingLevels(),
    });
    app.enableShutdownHooks();
    logger.log(`Shard worker ${shardId} started (no HTTP server)`);
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

  await (app as INestApplication).listen(process.env.PORT || 3000);
  logger.log(
    `Main sharding manager listening on port ${process.env.PORT || 3000}`,
  );
}
bootstrap();
