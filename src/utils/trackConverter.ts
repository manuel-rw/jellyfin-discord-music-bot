import { SearchItem } from '../clients/jellyfin/search/search.item';
import { JellyfinSearchService } from '../clients/jellyfin/search/jellyfin.search.service';
import { Track } from '../models/track';

/**
 * Maps an array of search items from Jellyfin to internal models asynchronously.
 * @param hints The hints from Jellyfin to convert to
 * @param jellyfinSearchService The search service to use
 */
export const flatMapTrackItems = async (
  hints: SearchItem[],
  jellyfinSearchService: JellyfinSearchService,
): Promise<Track[]> => {
  const tracks: Track[] = [];
  for (const hint of hints) {
    const searchedTracks = await hint.toTracks(jellyfinSearchService);
    searchedTracks.forEach((track) => tracks.push(track));
  }
  return tracks;
};
