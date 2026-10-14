import { Module } from '@nestjs/common';
import { ShardService } from './shard.service';

@Module({
  imports: [],
  controllers: [],
  providers: [ShardService],
  exports: [ShardService],
})
export class ShardingModule {}
