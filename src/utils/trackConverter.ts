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
    tracks = [...tracks, ...searchedTracks];
  });
  return tracks;
};
