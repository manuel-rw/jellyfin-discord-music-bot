import { ConfigModule } from '@nestjs/config';
import { PermissionResolvable } from 'discord.js';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

export const environmentVariablesSchema = z.object({
  DISCORD_CLIENT_TOKEN: z.string(),
  JELLYFIN_SERVER_ADDRESS: z.string().url(),
  JELLYFIN_AUTHENTICATION_USERNAME: z.string(),
  JELLYFIN_AUTHENTICATION_PASSWORD: z.string(),
  UPDATER_DISABLE_NOTIFICATIONS: z
    .enum(['true', 'false'])
    .default('false')
    .optional(),
  LOG_LEVEL: z
    .enum(['ERROR', 'WARN', 'LOG', 'DEBUG', 'VERBOSE'])
    .default('LOG'),
  PORT: z.number().min(1).max(9999).optional(),
  ALLOW_EVERYONE: z.enum(['true', 'false']).default('false').optional(),
});

export const getEnvironmentVariables = () => {
  console.log(process.env);
  try {
    return environmentVariablesSchema.strip().parse(process.env);
  } catch (err) {
    throw fromZodError(err);
  }
};

export const defaultMemberPermissions: PermissionResolvable =
  getEnvironmentVariables().ALLOW_EVERYONE ? 'SendMessages' : 'Administrator';
