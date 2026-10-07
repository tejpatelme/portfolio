import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
} from "astro:env/server";

export type Track = {
  title: string;
  artists: string;
  url: string;
  albumArt?: { url: string; width: number; height: number };
  isPlaying: boolean;
};

type SpotifyImage = { url: string; width: number; height: number };
type SpotifyTrack = {
  name: string;
  type: string;
  artists: { name: string }[];
  album: { images: SpotifyImage[] };
  external_urls: { spotify: string };
};

// Never let Spotify slow down the page; render without the section instead.
const TIMEOUT_MS = 1500;

// Reused across invocations while the function instance stays warm.
let cachedToken: { value: string; expiresAt: number } | undefined;

async function getAccessToken(): Promise<string | undefined> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN!,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return undefined;

  const { access_token, expires_in } = await res.json();
  cachedToken = {
    value: access_token,
    // Refresh a minute early to avoid using a token right as it expires.
    expiresAt: Date.now() + (expires_in - 60) * 1000,
  };
  return access_token;
}

function toTrack(item: SpotifyTrack, isPlaying: boolean): Track {
  // Images are sorted largest first; pick the smallest one that is >= 64px.
  const albumArt = item.album.images.findLast((img) => img.width >= 64);
  return {
    title: item.name,
    artists: item.artists.map((a) => a.name).join(", "),
    url: item.external_urls.spotify,
    albumArt,
    isPlaying,
  };
}

async function spotifyGet(path: string, token: string) {
  return fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/**
 * Returns the track currently playing, or the last played track when nothing
 * is playing. Returns undefined if Spotify isn't configured or fails.
 */
export async function getNowPlaying(): Promise<Track | undefined> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    return undefined;
  }

  try {
    const token = await getAccessToken();
    if (!token) return undefined;

    const current = await spotifyGet("/me/player/currently-playing", token);
    // 204 means nothing is playing.
    if (current.status === 200) {
      const data = await current.json();
      // Skip podcasts/ads, which don't have the same shape as tracks.
      if (data.item?.type === "track") {
        return toTrack(data.item, data.is_playing);
      }
    }

    const recent = await spotifyGet("/me/player/recently-played?limit=1", token);
    if (!recent.ok) return undefined;
    const { items } = await recent.json();
    return items?.[0] ? toTrack(items[0].track, false) : undefined;
  } catch (error) {
    console.error("Failed to fetch Spotify now playing", error);
    return undefined;
  }
}
