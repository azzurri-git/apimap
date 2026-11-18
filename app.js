const form = document.querySelector("#route-form");
const statusMessage = document.querySelector("#status-message");
const resultCard = document.querySelector("#result-card");
const distanceValue = document.querySelector("#distance-value");
const mapLink = document.querySelector("#map-link");
const submitButton = form.querySelector('button[type="submit"]');
const swapButton = document.querySelector("#swap-button");

const locations = {
  origin: createLocationState("origin"),
  destination: createLocationState("destination"),
};
let nextGeocodeAt = 0;

function createLocationState(name) {
  return {
    input: document.querySelector(`#${name}`),
    suggestions: document.querySelector(`#${name}-suggestions`),
    selected: null,
    timer: null,
    controller: null,
    searchId: 0,
  };
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  if (type) {
    statusMessage.dataset.type = type;
  } else {
    delete statusMessage.dataset.type;
  }
}

function hideSuggestions(state) {
  state.suggestions.hidden = true;
  state.input.setAttribute("aria-expanded", "false");
}

function clearResult() {
  resultCard.hidden = true;
  distanceValue.textContent = "";
  mapLink.removeAttribute("href");
}

function renderSuggestions(state, results) {
  state.suggestions.replaceChildren();

  for (const result of results) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const name = document.createElement("span");
    const address = document.createElement("span");

    button.type = "button";
    button.className = "suggestion-option";
    button.setAttribute("role", "option");
    name.className = "suggestion-name";
    name.textContent = result.name;
    address.className = "suggestion-address";
    address.textContent = result.address;
    button.append(name, address);
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      state.selected = result;
      state.input.value = result.name;
      hideSuggestions(state);
      setStatus(`${result.name} 장소를 선택했습니다.`, "success");
    });
    item.append(button);
    state.suggestions.append(item);
  }

  state.suggestions.hidden = results.length === 0;
  state.input.setAttribute("aria-expanded", String(results.length > 0));
}

async function searchPlaces(state, query, searchId) {
  state.controller = new AbortController();
  setStatus("장소를 검색하고 있어요...", "loading");

  try {
    const now = Date.now();
    const delay = Math.max(0, nextGeocodeAt - now);
    nextGeocodeAt = Math.max(now, nextGeocodeAt) + 1100;
    if (delay > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
    if (state.controller.signal.aborted) return;

    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
      signal: state.controller.signal,
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "장소를 검색하지 못했습니다.");
    }
    if (searchId !== state.searchId) return;

    renderSuggestions(state, data.results);
    setStatus(
      data.results.length
        ? "검색 결과에서 장소를 선택해 주세요."
        : "검색 결과가 없습니다. 다른 장소명으로 검색해 주세요.",
      data.results.length ? "" : "error",
    );
  } catch (error) {
    if (error.name === "AbortError" || searchId !== state.searchId) return;
    hideSuggestions(state);
    setStatus(error.message || "장소를 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
  }
}

for (const state of Object.values(locations)) {
  state.input.addEventListener("input", () => {
    state.searchId += 1;
    window.clearTimeout(state.timer);
    if (state.controller) state.controller.abort();
    state.selected = null;
    clearResult();
    state.suggestions.replaceChildren();
    hideSuggestions(state);

    const query = state.input.value.trim();
    if (query.length < 2) {
      setStatus(query ? "두 글자 이상 입력해 주세요." : "");
      return;
    }

    setStatus("장소 검색을 준비하고 있어요...", "loading");
    state.timer = window.setTimeout(
      () => searchPlaces(state, query, state.searchId),
      600,
    );
  });

  state.input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSuggestions(state);
  });

  state.input.addEventListener("focus", () => {
    if (state.suggestions.childElementCount > 0 && !state.selected) {
      state.suggestions.hidden = false;
      state.input.setAttribute("aria-expanded", "true");
    }
  });
}

swapButton.addEventListener("click", () => {
  const originValue = locations.origin.input.value;
  const destinationValue = locations.destination.input.value;
  const originSelected = locations.origin.selected;
  const destinationSelected = locations.destination.selected;

  locations.origin.input.value = destinationValue;
  locations.destination.input.value = originValue;
  locations.origin.selected = destinationSelected;
  locations.destination.selected = originSelected;
  for (const state of Object.values(locations)) {
    state.searchId += 1;
    window.clearTimeout(state.timer);
    if (state.controller) state.controller.abort();
    hideSuggestions(state);
  }
  clearResult();
  setStatus("");
});

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters).toLocaleString("ko-KR")} m`;
  }
  const kilometers = meters / 1000;
  const precision = kilometers >= 100 ? 0 : 1;
  return `${kilometers.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  })} km`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const origin = locations.origin.selected;
  const destination = locations.destination.selected;

  if (!origin || !destination) {
    setStatus("출발지와 도착지를 각각 검색한 뒤 결과를 선택해 주세요.", "error");
    clearResult();
    return;
  }
  if (origin.lat === destination.lat && origin.lon === destination.lon) {
    setStatus("출발지와 도착지를 서로 다른 장소로 선택해 주세요.", "error");
    clearResult();
    return;
  }

  clearResult();
  setStatus("자동차 경로를 계산하고 있어요...", "loading");
  submitButton.disabled = true;

  try {
    const params = new URLSearchParams({
      from: `${origin.lat},${origin.lon}`,
      to: `${destination.lat},${destination.lon}`,
    });
    const response = await fetch(`/api/route?${params}`, {
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "경로를 계산하지 못했습니다.");
    }

    distanceValue.textContent = formatDistance(data.distanceMeters);
    const route = `${origin.lat},${origin.lon};${destination.lat},${destination.lon}`;
    mapLink.href = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`;
    resultCard.hidden = false;
    setStatus("자동차 도로 경로 기준 거리입니다.", "success");
  } catch (error) {
    setStatus(error.message || "경로를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
