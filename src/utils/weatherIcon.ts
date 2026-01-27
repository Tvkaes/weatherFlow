const mapRange = (value: number, mapping: [number[], number][]): number | null => {
  for (const [codes, icon] of mapping) {
    if (codes.includes(value)) return icon;
  }
  return null;
};

export const mapWmoToOwm = (code: number): number => {
  const direct = mapRange(code, [
    [[0], 800],
    [[1], 801],
    [[2], 802],
    [[3], 803],
    [[45, 48], 741],
    [[51], 300],
    [[53], 301],
    [[55], 302],
    [[56, 57], 511],
    [[61], 500],
    [[63], 501],
    [[65], 502],
    [[66, 67], 511],
    [[71], 600],
    [[73], 601],
    [[75], 602],
    [[77], 611],
    [[80], 520],
    [[81], 521],
    [[82], 522],
    [[85], 620],
    [[86], 621],
    [[95], 200],
    [[96], 201],
    [[99], 202],
  ]);

  if (direct) return direct;

  if (code >= 95) return 211;
  if (code >= 85) return 621;
  if (code >= 80) return 520;
  if (code >= 70) return 600;
  if (code >= 60) return 500;
  if (code >= 50) return 300;
  if (code >= 40) return 741;
  if (code >= 3) return 803;
  return 800;
};

export const getWeatherIconProps = (code: number, isDay = true) => ({
  iconId: mapWmoToOwm(code),
  night: !isDay,
});

export const getWeatherIconClass = (code: number, isDay?: boolean) => {
  const iconId = mapWmoToOwm(code);
  if (isDay === true) return { iconId, className: `wi wi-owm-day-${iconId}` };
  if (isDay === false) return { iconId, className: `wi wi-owm-night-${iconId}` };
  return { iconId, className: `wi wi-owm-${iconId}` };
};

export const describeWeatherCode = (code: number): string => {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast conditions';
  if (code === 45 || code === 48) return 'Foggy conditions';
  if ([51, 53, 55].includes(code)) return 'Drizzle';
  if (code === 56 || code === 57) return 'Freezing drizzle';
  if ([61, 63, 65].includes(code)) return 'Rainfall';
  if (code === 66 || code === 67) return 'Freezing rain';
  if ([71, 73, 75].includes(code)) return 'Snowfall';
  if (code === 77) return 'Snow grains';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code === 96 || code === 99) return 'Severe thunderstorm with hail';
  return 'Mixed weather conditions';
};
