const fetch = require('node-fetch');
async function debug() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.log('No API KEY');
    return;
  }
  const id = 550; // Fight Club
  const url = `https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data.results.IN, null, 2));
}
debug();
