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

function createCard(pokemon) {
  let card = document.createElement("div");
  card.className = "card";
  card.dataset.id = pokemon.id;
  card.innerHTML = buildCardHTML(pokemon);
  card.addEventListener("click", () => openOverlay(pokemon.id));
  return card;
}

function buildCardHTML(pokemon) {
  let img = pokemon.sprites.other["official-artwork"].front_default
     pokemon.sprites.front_default;
  let types = pokemon.types.map(t => `<div class="type">${t.type.name}</div>`).join("");
  return `
    <img src="${img}" alt="${pokemon.name}" />
    <div>
      <div>
        <div class="small">#${pokemon.id.toString().padStart(3, "0")}</div>
        <div style="font-weight:700;text-transform:capitalize">${pokemon.name}</div>
      </div>
      <div class="types">${types}</div>
    </div>`;
}

async function renderChunk() {
  let grid = document.getElementById("grid");
  let slice = allPokemonList.slice(loadedCount, loadedCount + perPage);
  for (let entry of slice) {
    let id = entry.url.split("/").filter(Boolean).pop();
    let pokemon = await fetchDetails(id);
    grid.appendChild(createCard(pokemon));
    visibleIDs.push(Number(id));
  }
  loadedCount += slice.length;
  document.getElementById("loadMore").disabled = loadedCount >= 151;
}

function searchHandler() {
  let query = document.getElementById("search").value.toLowerCase();
  document.querySelectorAll(".card").forEach(card => {
    let name = card.querySelector("div[style]").textContent.toLowerCase();
    card.style.display = (query.length < 3 || name.includes(query)) ? "block" : "none";
  });
}

async function openOverlay(id) {
  currentPokemonId = Number(id);
  let pokemon = await fetchDetails(currentPokemonId);
  showModalData(pokemon);
  document.getElementById("overlay").classList.add("show");
}

function closeOverlay() {
  document.getElementById("overlay").classList.remove("show");
  currentPokemonId = null;
}

function showModalData(pokemon) {
  let img = pokemon.sprites.other["official-artwork"].front_default
      pokemon.sprites.front_default;
  document.getElementById("overlayImg").src = img;
  document.getElementById("overlayTitle").textContent =
    `#${pokemon.id} ${capitalize(pokemon.name)}`;
  document.getElementById("overlayTypes").innerHTML =
    pokemon.types.map(typeInfo => `<div class="type">${typeInfo.type.name}</div>`).join("");
  renderTab("main", pokemon);
}

function prevNext(direction) {
  if (!currentPokemonId) return;
  let index = visibleIDs.indexOf(currentPokemonId);
  if (index === -1) return;
  index = (index + direction + visibleIDs.length) % visibleIDs.length;
  openOverlay(visibleIDs[index]);
}

async function renderTab(tab, pokemon) {
  let tabContent = document.getElementById("tabContent");
  if (tab === "main") renderMainTab(tabContent, pokemon);
  else if (tab === "stats") renderStatsTab(tabContent, pokemon);
  else if (tab === "evo") await renderEvoTab(tabContent, pokemon);
}