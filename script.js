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
  let id = pokemon.id;
  let name = pokemon.name;
  let img = pokemon.sprites.other["official-artwork"].front_default 
            pokemon.sprites.front_default;
  let typesHtml = pokemon.types
    .map(t => `<div class="type">${t.type.name}</div>`).join("");
  let card = document.createElement("div");
  card.className = "card";
  card.dataset.id = id;
  card.innerHTML = buildCardHTML(id, name, img, typesHtml);
  card.addEventListener("click", () => openOverlay(id));
  return card;
}

function buildCardHTML(id, name, img, typesHtml) {
  return `
    <img src="${img}" alt="${name}" />
    <div>
      <div>
        <div class="small">#${id.toString().padStart(3, "0")}</div>
        <div style="font-weight:700;text-transform:capitalize">${name}</div>
      </div>
      <div class="types">${typesHtml}</div>
    </div>`;
}


async function renderChunk() {
  let button = document.getElementById("loadMore");
  button.disabled = true;

  let grid = document.getElementById("grid");
  let slice = allPokemonList.slice(loadedCount, loadedCount + perPage);

  for (let entry of slice) {
    let id = Number(entry.url.split("/").filter(Boolean).pop());
    if (visibleIDs.includes(id)) {
      continue;
    }
    let pokemon = await fetchDetails(id);
    grid.appendChild(createCard(pokemon));
    visibleIDs.push(id);
  }
  loadedCount += slice.length;
  button.disabled = loadedCount >= 151 ? true : false;
}



function searchHandler() {
  let query = document.getElementById("search").value.toLowerCase();

  if (query.length >= 3) {
    performSearch(query);
  } else {
    resetSearch();
  }
}

function performSearch(query) {
  let grid = document.getElementById("grid");
  let button = document.getElementById("loadMore");

  grid.innerHTML = "";
  let match = allPokemonList.find(p => p.name.includes(query));

  if (match) {
    let id = Number(match.url.split("/").filter(Boolean).pop());
    fetchDetails(id).then(pokemon => {
      grid.appendChild(createCard(pokemon));
    });
  } else {
    grid.innerHTML = `<div class="not-found">
      Pokemon not found</div>`;
  }

  button.textContent = "back";
  button.onclick = () => resetSearch();
}



function resetSearch() {
  let grid = document.getElementById("grid");
  grid.innerHTML = "";
  visibleIDs = [];
  loadedCount = 0;

  renderChunk();

  let button = document.getElementById("loadMore");
  button.textContent = "load more";
  button.onclick = () => renderChunk();
}

async function openOverlay(id) {
  currentPokemonId = Number(id);
  let pokemon = await fetchDetails(currentPokemonId);
  showModalData(pokemon);
  document.getElementById("overlay").classList.add("show");
  document.body.style.overflow = "hidden"; 
}

function closeOverlay() {
  document.getElementById("overlay").classList.remove("show");
  currentPokemonId = null;
  document.body.style.overflow = "auto";
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

function renderMainTab(tabContent, pokemon) {
  tabContent.innerHTML = `
    <div class="small">Height: ${pokemon.height} • Weight: ${pokemon.weight}</div>
    <p class="small">Abilities: ${pokemon.abilities.map(abilityInfo => abilityInfo.ability.name).join(", ")}</p>
  `;
}

function renderStatsTab(tabContent, pokemon) {
  tabContent.innerHTML = "";
  pokemon.stats.forEach(stat => {
    let name = stat.stat.name;
  let value = stat.base_stat;
  let width = Math.min(100, (value / 255) * 100);
  let wrap = document.createElement("div");
  wrap.innerHTML = buildStatHTML(name, value, width);
  tabContent.appendChild(wrap);
  });
}

function buildStatHTML(name, value, width) {
  return `
    <div class="small">${name}: ${value}</div>
    <div class="statbar">
      <div class="statfill" style="width:${width}%;"></div>
    </div>`;
}

async function renderEvoTab(tabContent, pokemon) {
  tabContent.innerHTML = "<div class='small'>load evolution ...</div>";
  let chain = await fetchEvoChain(pokemon.id);
  tabContent.innerHTML = "";
  let evoDiv = document.createElement("div");
  evoDiv.className = "evos";
  for (let name of chain) {
    evoDiv.appendChild(await buildEvoElement(name));
  }
  tabContent.appendChild(evoDiv);
}

async function fetchEvoChain(id) {
  let speciesResponse = await fetch(`${API_BASE}/pokemon-species/${id}`);
  let species = await speciesResponse.json();
  let evoResponse = await fetch(species.evolution_chain.url);
  let evo = await evoResponse.json();
  let chain = [], node = evo.chain;
  while (node) {
    chain.push(node.species.name);
    node = node.evolves_to[0];
  }
  return chain;
}

async function buildEvoElement(name) {
  let evoPokemon = await fetchDetails(name);
  let img = evoPokemon.sprites.other["official-artwork"].front_default
      evoPokemon.sprites.front_default;
  let element = document.createElement("div");
  element.innerHTML = `<img src="${img}" /><div class="small" style="text-transform:capitalize">${name}</div>`;
  return element;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

async function showTab(tab) {
  let id = currentPokemonId  
      visibleIDs[0];
  let pokemon = await fetchDetails(id);
  renderTab(tab, pokemon);
}

async function init() {
  await loadList();
  await renderChunk();
}
