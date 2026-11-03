import { renderer } from './szene.js';
import { state } from './himmel.js';

const html = document.documentElement, startEl = document.getElementById('start');
let wunsch = false;

const ausblenden = on => html.classList.toggle('foto', on);
function fotoNachBild() {
  if (!wunsch) return;
  wunsch = false;
  const ort = document.getElementById('placeName').textContent.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'Tempel';
  const h = Math.floor(state.hour), m = Math.floor((state.hour - h) * 60);
  const name = `Edfu-${ort}-${String(h).padStart(2, '0')}-${String(m).padStart(2, '0')}.png`;
  renderer.domElement.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}

document.getElementById('fotoAus').addEventListener('click', e => { e.currentTarget.blur(); ausblenden(true); });
document.getElementById('fotoBild').addEventListener('click', e => { e.currentTarget.blur(); wunsch = true; });
document.getElementById('fotoEin').addEventListener('click', () => ausblenden(false));
addEventListener('keydown', e => {
  if (e.repeat || !startEl.classList.contains('hidden') || html.classList.contains('karte')) return;
  if (e.code === 'KeyH') ausblenden(!html.classList.contains('foto'));
  if (e.code === 'KeyB') wunsch = true;
});

export { fotoNachBild };
