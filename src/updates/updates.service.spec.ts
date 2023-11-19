import { Test } from '@nestjs/testing';
import axios from 'axios';
import { Client, GuildMember } from 'discord.js';
import { Constants } from '../utils/constants';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { GithubRelease } from '../models/GithubRelease';
import { useDefaultMockerToken } from '../utils/tests/defaultMockerToken';
import { UpdatesService } from './updates.service';
import { InjectionToken } from '@nestjs/common';

// mock axios: https://stackoverflow.com/questions/51275434/type-of-axios-mock-using-jest-typescript/55351900#55351900
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('UpdatesService', () => {
  const OLD_ENV = process.env;

  let updatesService: UpdatesService;
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

        if (token === Client || token === '__inject_discord_client__') {
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

        return useDefaultMockerToken(token as InjectionToken);
      })
      .compile();

    updatesService = moduleRef.get<UpdatesService>(UpdatesService);
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
    Constants.Metadata.Version = {
      All: () => '0.0.5',
      Major: 0,
      Minor: 0,
      Patch: 5,
    };

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
