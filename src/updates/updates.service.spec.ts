import { Test } from '@nestjs/testing';
import axios from 'axios';
import { GuildMember } from 'discord.js';
import { Constants } from '../utils/constants';
import { GithubRelease } from '../models/GithubRelease';
import { UpdatesService } from './updates.service';

// mock axios: https://stackoverflow.com/questions/51275434/type-of-axios-mock-using-jest-typescript/55351900#55351900
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('UpdatesService', () => {
  const OLD_ENV = process.env;

  let updatesService: UpdatesService;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdatesService,
        {
          provide: '__inject_discord_client__',
          useValue: {
            guilds: {
              cache: [
                {
                  fetchOwner: () =>
                    ({
                      send: jest.fn(),
                      user: { tag: 'test' },
                    }) as unknown as GuildMember,
                },
              ],
            },
          },
        },
      ],
    }).compile();

    updatesService = moduleRef.get<UpdatesService>(UpdatesService);
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
  });
});
