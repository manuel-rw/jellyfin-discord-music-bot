export class PlayNowCommand {
  /**
   * A list of all items available in the parent element.
   * Usually, this is a list of all tracks in an album or playlist.
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
   * PlayNow: Play the selection immideatly
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
    if (this.hasSelection()) {
      return [this.ItemIds[this.StartIndex]];
    }

    return this.ItemIds;
  }
}
