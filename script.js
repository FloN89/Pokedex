const API_BASE = "https://pokeapi.co/api/v2";
let allPokemonList = [], loadedCount = 0, perPage = 20;
let visibleIDs = [], pokemonCache = {}, currentPokemonId = null;

async function loadList() {
  let response = await fetch(`${API_BASE}/pokemon?limit=151`);
  let data = await response.json();
  allPokemonList = data.results;
}

async function fetchDetails(idOrName) {
  if (pokemonCache[idOrName]) return pokemonCache[idOrName];
  let response = await fetch(`${API_BASE}/pokemon/${idOrName}`);
  let data = await response.json();
  pokemonCache[idOrName] = data;
  return data;
}