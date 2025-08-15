import Constants from "expo-constants";

export async function fetchWeather(lat, lon) {
  const apiKey = (Constants.expoConfig?.extra || Constants.manifest?.extra)?.openWeatherApiKey;
  if (!apiKey) return { tempC: null, humidityPct: null, rain1hMm: 0, condition: null };
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const res = await fetch(url);
  const j = await res.json();
  return {
    tempC: j?.main?.temp ?? null,
    humidityPct: j?.main?.humidity ?? null,
    rain1hMm: j?.rain?.["1h"] ?? 0,
    condition: j?.weather?.[0]?.main ?? null
  };
}