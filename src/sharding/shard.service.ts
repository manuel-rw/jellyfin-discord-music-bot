import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShardingManager } from 'discord.js';
import { join } from 'path';

@Injectable()
export class ShardService {
  private readonly logger = new Logger(ShardService.name);
  private shardingManager: ShardingManager | null = null;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Initialize the sharding manager
   * Each shard will run as a separate process with its own Discord client
   * and Jellyfin WebSocket connection
   */
  initializeSharding() {
    const shardCount = this.getShardCount();
    
    this.logger.log(
      `Initializing sharding with ${shardCount} shards for multi-guild support`,
    );

    // Create sharding manager that spawns shard processes
    this.shardingManager = new ShardingManager(join(__dirname, 'shard.worker.js'), {
      token: process.env.DISCORD_CLIENT_TOKEN,
      totalShards: shardCount,
      mode: 'process',
    });

    // Handle shard launch events
    this.shardingManager.on('shardCreate', (shard) => {
      this.logger.log(`Shard ${shard.id} created`);
      
      shard.on('ready', () => {
        this.logger.log(`Shard ${shard.id} is ready`);
        this.eventEmitter.emit('shard.ready', shard.id);
      });

      shard.on('disconnect', () => {
        this.logger.warn(`Shard ${shard.id} disconnected`);
      });

      shard.on('error', (error) => {
        this.logger.error(`Shard ${shard.id} error: ${error.message}`);
      });
    });

    // Start spawning shards
    this.shardingManager.spawn();
    this.logger.log('Sharding manager started, spawning shards...');
  }

  /**
   * Get the optimal shard count based on guild count
   * Discord recommends auto sharding which calculates based on guild count
   */
  private getShardCount(): number | 'auto' {
    // Use 'auto' to let Discord calculate the optimal shard count
    // This is the recommended approach
    return 'auto';
  }

  /**
   * Get the sharding manager instance
   */
  getShardingManager(): ShardingManager | null {
    return this.shardingManager;
  }

  /**
   * Check if sharding is enabled
   */
  isShardingEnabled(): boolean {
    return this.shardingManager !== null;
  }
}
