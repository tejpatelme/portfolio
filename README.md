A neat, clean and simple portfolio website.

## Spotify "Listening to" section

The home page is prerendered as static HTML. The Spotify section is an Astro
[server island](https://docs.astro.build/en/guides/server-islands/)
(`src/components/SpotifyStatus.astro`): a tiny inline script fetches it from a
Netlify function after the page loads. That response is cached at the edge for
30s with stale-while-revalidate. If the env vars below are missing or Spotify
fails/times out, the section is simply omitted.

### Setup

1. Create an app at https://developer.spotify.com/dashboard and add
   `http://127.0.0.1:3000/callback` as a Redirect URI.
2. Open this URL in a browser (replace `CLIENT_ID`) and approve:

   ```
   https://accounts.spotify.com/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fcallback&scope=user-read-currently-playing%20user-read-recently-played
   ```

3. The redirect page will fail to load ("127.0.0.1 refused to connect"); that's
   expected. Copy the `code` query param from the address bar (it expires in a
   few minutes and works once), then exchange it:

   ```sh
   curl -X POST https://accounts.spotify.com/api/token \
     -u CLIENT_ID:CLIENT_SECRET \
     -d grant_type=authorization_code \
     -d code=CODE \
     -d redirect_uri=http://127.0.0.1:3000/callback
   ```

4. Add these env vars in Netlify (and in `.env` for local dev):

   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   SPOTIFY_REFRESH_TOKEN=...   # refresh_token from step 3
   ```
