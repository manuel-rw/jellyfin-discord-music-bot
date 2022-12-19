import {
  Catch,
  DiscordArgumentMetadata,
  DiscordExceptionFilter,
  On,
} from '@discord-nestjs/core';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentBuilder,
  Events,
  Interaction,
} from 'discord.js';
import { DiscordMessageService } from '../clients/discord/discord.message.service';
import { Constants } from '../utils/constants';

@Catch(Error)
export class CommandExecutionError implements DiscordExceptionFilter {
  constructor(private readonly discordMessageService: DiscordMessageService) {}

  async catch(
    exception: Error,
    metadata: DiscordArgumentMetadata<string, any>,
  ): Promise<void> {
    console.log(metadata);
    const interaction: CommandInteraction = metadata.eventArgs[0];

    if (!interaction.isCommand()) {
      return;
    }

    console.log(exception);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Report this issue')
        .setStyle(ButtonStyle.Link)
        .setURL(
          Constants.Links.BugReport(
            `[Bug]: ${exception.name} - ${exception.message}`,
          ).toString(),
        ),
    );

    interaction.reply({
      embeds: [
        this.discordMessageService.buildErrorMessage({
          title: 'An unexpected exception occured',
          description: `Oh no! This isn't supposed to happen. Something did not went right during the execution of your command.\n\nPlease check if there is any update available. If not, please check on ${Constants.Links.Issues} if this problem has already been reported. If not, please report this problem using the button below.\n\n**Debug Information** (please include in your report):\n\`\`\`${exception.stack}\`\`\``,
        }),
      ],
      components: [row],
    });
  }
}
