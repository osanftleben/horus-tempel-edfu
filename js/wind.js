const windStaerke = { value: 0.4 }, windPhase = { value: 0 };
let gust = 0.5, gustZiel = 0.5, gustBis = 0;

setInterval(() => {
  const now = performance.now() / 1000;
  if (now > gustBis) {
    gustZiel = Math.random() ** 2;
    gustBis = now + 0.5 + Math.random() * 2;
  }
  gust += (gustZiel - gust) * 0.12 + (Math.random() - 0.5) * 0.04;
  gust = Math.min(1, Math.max(0, gust));
}, 100);

function updateWind(dt) {
  windStaerke.value += (0.3 + 0.7 * gust - windStaerke.value) * Math.min(1, dt * 1.5);
  windPhase.value = (windPhase.value + dt * (3 + 5 * windStaerke.value)) % (200 * Math.PI);
}
const boe = () => gust;

export { boe, updateWind, windPhase, windStaerke };
