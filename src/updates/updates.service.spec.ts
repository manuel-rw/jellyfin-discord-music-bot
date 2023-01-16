import { Test } from '@nestjs/testing';
import axios from 'axios';
import { Client, GuildMember } from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { GithubRelease } from '../models/github-release';
import { useDefaultMockerToken } from '../utils/tests/defaultMockerToken';
import { UpdatesService } from './updates.service';

// mock axios: https://stackoverflow.com/questions/51275434/type-of-axios-mock-using-jest-typescript/55351900#55351900
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('UpdatesService', () => {
  const OLD_ENV = process.env;

  let updatesService: UpdatesService;
  let discordClient: Client;
  let discordMessageService: DiscordMessageService;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      providers: [UpdatesService],
    })
      .useMocker((token) => {
        if (token === DiscordMessageService) {
          return {
            client: jest.fn().mockReturnValue({}),
            buildMessage: jest.fn(),
            buildErrorMessage: jest.fn(),
          } as DiscordMessageService;
        }

        if (token === Client || token == '__inject_discord_client__') {
          return {
            guilds: {
              cache: [
                {
                  fetchOwner: () =>
                    ({
                      send: jest.fn(),
                      user: { tag: 'test' },
                    } as unknown as GuildMember),
                },
              ],
            },
          };
        }

        return useDefaultMockerToken(token);
      })
      .compile();

    updatesService = moduleRef.get<UpdatesService>(UpdatesService);
    discordClient = moduleRef.get<Client>('__inject_discord_client__');
    discordMessageService = moduleRef.get<DiscordMessageService>(
      DiscordMessageService,
    );
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('handleCronShouldNotNotifyWhenDisabledViaEnvironmentVariable', async () => {
    process.env.UPDATER_DISABLE_NOTIFICATIONS = 'true';
    mockedAxios.mockResolvedValue({
      data: {
        html_url: 'https://github.com',
        name: 'testing release',
        tag_name: '0.0.6',
        published_at: '2023-01-09T22:11:25Z',
      } as GithubRelease,
      status: 200,
      statusText: 'Ok',
      headers: {},
      config: {},
    });

    await updatesService.handleCron();

    expect(mockedAxios).not.toHaveBeenCalled();
    expect(discordMessageService.buildMessage).not.toHaveBeenCalled();
    expect(discordMessageService.buildErrorMessage).not.toHaveBeenCalled();
  });

  it('handleCronShouldNotifyWhenNewRelease', async () => {
    process.env.UPDATER_DISABLE_NOTIFICATIONS = 'false';

    mockedAxios.mockResolvedValue({
      data: {
        html_url: 'https://github.com',
        name: 'testing release',
        tag_name: '0.0.6',
        published_at: '2023-01-09T22:11:25Z',
      } as GithubRelease,
      status: 200,
      statusText: 'Ok',
      headers: {},
      config: {},
    });

    await updatesService.handleCron();

    expect(mockedAxios).toHaveBeenCalled();
    expect(discordMessageService.buildMessage).toHaveBeenCalled();
  });
});
