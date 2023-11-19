import { JellyfinSearchService } from 'src/clients/jellyfin/jellyfin.search.service';
import { SearchItem } from 'src/models/search/SearchItem';
import { Track } from 'src/models/music/Track';

export const flatMapTrackItems = (
  hints: SearchItem[],
  jellyfinSearchService: JellyfinSearchService,
): Track[] => {
  let tracks: Track[] = [];
  hints.forEach(async (hint) => {
    const searchedTracks = await hint.toTracks(jellyfinSearchService);
    searchedTracks.forEach((track) => tracks.push(track));
  });
  return tracks;
};
