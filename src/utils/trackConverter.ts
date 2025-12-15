import { JellyfinSearchService } from 'src/clients/jellyfin/search/jellyfin.search.service';
import { SearchItem } from 'src/clients/jellyfin/search/search.item';
import { Track } from 'src/models/track';

export const flatMapTrackItems = (
  hints: SearchItem[],
  jellyfinSearchService: JellyfinSearchService,
): Track[] => {
  const tracks: Track[] = [];
  hints.forEach(async (hint) => {
    const searchedTracks = await hint.toTracks(jellyfinSearchService);
    searchedTracks.forEach((track) => tracks.push(track));
  });
  return tracks;
};
