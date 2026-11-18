function parseCoordinates(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(",");
  if (parts.length !== 2) return null;

  const [lat, lon] = parts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

module.exports = async function route(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "GET 요청만 지원합니다." });
  }

  const from = parseCoordinates(request.query.from);
  const to = parseCoordinates(request.query.to);
  if (!from || !to) {
    return response.status(400).json({ error: "출발지와 도착지 좌표가 올바르지 않습니다." });
  }
  if (from.lat === to.lat && from.lon === to.lon) {
    return response.status(400).json({ error: "출발지와 도착지를 서로 다른 장소로 선택해 주세요." });
  }

  const coordinates = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&alternatives=false&steps=false`;

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) {
      return response.status(502).json({ error: "경로 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }

    const data = await upstream.json();
    const distanceMeters = data.code === "Ok" ? data.routes?.[0]?.distance : null;
    if (!Number.isFinite(distanceMeters)) {
      return response.status(404).json({ error: "두 장소 사이의 자동차 경로를 찾지 못했습니다." });
    }

    response.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return response.status(200).json({ distanceMeters });
  } catch {
    return response.status(502).json({ error: "경로를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요." });
  }
};
