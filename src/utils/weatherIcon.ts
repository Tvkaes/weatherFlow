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
