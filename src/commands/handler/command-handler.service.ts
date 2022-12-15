import { EmbedBuilder } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ApplicationCommand,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { DiscordService } from 'src/clients/discord/discord.service';
import { Command } from '../abstractCommand';

@Injectable()
export class CommandHandlerService {
  private logger: Logger = new Logger(CommandHandlerService.name);

  constructor(private discordService: DiscordService) {}

  @OnEvent('client.discord.ready')
  async handleOnDiscordClientReady() {
    var commands = [
      new SlashCommandBuilder()
        .setName('play')
        .setDescription('Immideatly play a track')
        .addStringOption((option) =>
          option
            .setName('track')
            .setDescription('the track name')
            .setRequired(true),
        ),
      new SlashCommandBuilder()
        .setName('summon')
        .setDescription('Join your current voice channel'),
      new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Disconnect from the current voice channel'),
      new SlashCommandBuilder()
        .setName('enqueue')
        .setDescription('Enqueue a track to the current playlist')
        .addStringOption((option) =>
          option
            .setName('track')
            .setDescription('the track name')
            .setRequired(true),
        ),
      new SlashCommandBuilder()
        .setName('current')
        .setDescription('Print the current track information'),
      new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause or resume the playback of the current track'),
      new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track'),
      new SlashCommandBuilder()
        .setName('stop')
        .setDescription(
          'Stop playback entirely and clear the current playlist',
        ),
      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help for this Discord Bot'),
    ];

    await this.discordService
      .getClient()
      .application.commands.set(commands.map((x) => x.toJSON()));

    this.discordService
      .getClient()
      .on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) {
          return;
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: 'Jellyfin Discord Bot',
                iconURL:
                  'https://github.com/walkxcode/dashboard-icons/blob/main/png/jellyfin.png?raw=true',
                url: 'https://github.com/manuel-rw/jellyfin-discord-music-bot',
              })
              .setTitle('Help Information')
              .setDescription(
                'Jellyfin Discord Music bot is an easy way to broadcast your music collection to a Discord voicechannel.',
              )
              .addFields([
                {
                  name: 'Report an issue',
                  value:
                    'https://github.com/manuel-rw/jellyfin-discord-music-bot/issues/new/choose',
                  inline: true,
                },
                {
                  name: 'Source code',
                  value:
                    'https://github.com/manuel-rw/jellyfin-discord-music-bot',
                  inline: true,
                },
              ])
              .toJSON(),
          ],
        });
      });
  }
}
