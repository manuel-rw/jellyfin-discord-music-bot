import { PermissionResolvable } from 'discord.js';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import { config } from 'dotenv';
config();

export const environmentVariablesSchema = z.object({
  DISCORD_CLIENT_TOKEN: z.string(),
  JELLYFIN_SERVER_ADDRESS: z.string().url(),
  JELLYFIN_AUTHENTICATION_USERNAME: z.string(),
  JELLYFIN_AUTHENTICATION_PASSWORD: z.string(),
  UPDATER_DISABLE_NOTIFICATIONS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => Boolean(value)),
  LOG_LEVEL: z
    .enum(['ERROR', 'WARN', 'LOG', 'DEBUG', 'VERBOSE'])
    .default('LOG'),
  PORT: z.preprocess(
    (value) => (Number.isInteger(value) ? Number(value) : undefined),
    z.number().positive().max(9999).default(3000),
  ),
  ALLOW_EVERYONE_FOR_DEFAULT_PERMS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  AUTO_DELETE_BOT_MESSAGES_SECONDS: z.preprocess((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }, z.number().default(0)),
  LOCKED_CHANNEL_IDS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  NOW_PLAYING_MESSAGE_TEMPLATE: z.string().default('**%Track**'),
});

export const getEnvironmentVariables = () => {
  const result = environmentVariablesSchema.strip().safeParse(process.env);
  if (result.success) {
    return result.data;
  }
  throw fromZodError(result.error);
};

export const defaultMemberPermissions: PermissionResolvable | undefined =
  getEnvironmentVariables().ALLOW_EVERYONE_FOR_DEFAULT_PERMS
    ? 'ViewChannel'
    : undefined;
