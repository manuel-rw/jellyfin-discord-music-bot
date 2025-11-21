import { PlaystateCommand } from '@jellyfin/sdk/lib/generated-client/models';

export class PlayNowCommand {
  /**
   * A list of all items available in the parent element.
   * Usually, this is a list of all tracks on an album or playlist.
   */
  ItemIds: string[];

  /**
   * A nullable index, that references an item in the ItemIds array.
   * If this index is present, the command sender wishes to play only this specific item.
   * If there is no index present, the sender would like to play all items in the ItemIds array.
   */
  StartIndex?: number;

  /**
   * An enum of possible play modes.
   * PlayNow: Play the selection immediately
   */
  PlayCommand: 'PlayNow';

  /**
   * The user who has sent the command via web socket
   */
  ControllingUserId: string;

  hasSelection() {
    return this.StartIndex !== undefined;
  }

  getSelection(): string[] {
    if (this.hasSelection() && this.StartIndex !== undefined) {
      return [this.ItemIds[this.StartIndex]];
    }

    return this.ItemIds;
  }
}

export interface SessionApiSendPlayStateCommandRequest {
  /**
   * The MediaBrowser.Model.Session.PlayStateCommand.
   */
  readonly Command: PlaystateCommand;
  /**
   * The optional position ticks.
   */
  readonly SeekPositionTicks?: number;
  /**
   * The optional controlling user id.
   */
  readonly ControllingUserId?: string;
}
