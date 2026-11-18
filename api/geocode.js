const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const APP_USER_AGENT = "apimap-distance-app/1.0 (OpenStreetMap Nominatim search)";

module.exports = async function geocode(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "GET 요청만 지원합니다." });
  }

  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (query.length < 2 || query.length > 200) {
    return response.status(400).json({ error: "장소명을 두 글자 이상 입력해 주세요." });
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": APP_USER_AGENT,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return response.status(502).json({ error: "장소 검색 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }

    const places = await upstream.json();
    const results = places
      .filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)))
      .map((place) => ({
        name: place.name || place.display_name.split(",")[0],
        address: place.display_name,
        lat: Number(place.lat),
        lon: Number(place.lon),
      }));

    response.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return response.status(200).json({ results });
  } catch {
    return response.status(502).json({ error: "장소 검색 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." });
  }
};
