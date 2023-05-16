import { PermissionResolvable } from 'discord.js';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import * as env from 'dotenv';
env.config();

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
    .transform((value) => Boolean(value)),
});

export const getEnvironmentVariables = () => {
  try {
    return environmentVariablesSchema.strip().parse(process.env);
  } catch (err) {
    throw fromZodError(err);
  }
};

export const defaultMemberPermissions: PermissionResolvable | undefined =
  getEnvironmentVariables().ALLOW_EVERYONE_FOR_DEFAULT_PERMS ? 'ViewChannel' : undefined;
