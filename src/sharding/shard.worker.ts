/**
 * Shard worker entry point
 * This file is executed by the ShardingManager for each shard
 * It creates a separate NestJS application instance for each shard
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';

const logger = new Logger('ShardWorker');

async function bootstrapShard() {
  try {
    const shardId = process.env.SHARD_ID || 'unknown';
    const totalShards = process.env.SHARD_COUNT || 'unknown';
    
    logger.log(`Starting shard worker process (shard ${shardId}/${totalShards})`);

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
    });

    app.enableShutdownHooks();

    // Start the application
    await app.listen(process.env.PORT || 3000);

    logger.log(`Shard ${shardId} is ready and listening`);
  } catch (error: any) {
    logger.error(`Failed to start shard worker: ${error.message}`, error.stack);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGTERM', () => {
  logger.log('Shard worker received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.log('Shard worker received SIGINT, shutting down...');
  process.exit(0);
});

bootstrapShard();
