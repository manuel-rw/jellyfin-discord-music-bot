import { SlashCommandBuilder } from "discord.js";

export abstract class Command {
  abstract builder(): SlashCommandBuilder;
  abstract execute(): void;
}