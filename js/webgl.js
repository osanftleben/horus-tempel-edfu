if (!document.createElement('canvas').getContext('webgl2')) {
  document.getElementById('err').style.display = 'flex';
  throw new Error('Kein WebGL 2');
}
