import { JellyfinSearchService } from 'src/clients/jellyfin/jellyfin.search.service';
import { SearchHint } from 'src/models/search/SearchHint';
import { Track } from 'src/models/shared/Track';

export const convertToTracks = (
  hints: SearchHint[],
  jellyfinSearchService: JellyfinSearchService,
): Track[] => {
  let tracks: Track[] = [];
  hints.forEach(async (hint) => {
    const searchedTracks = await hint.toTracks(jellyfinSearchService);
    tracks = [...tracks, ...searchedTracks];
  });
  return tracks;
};
