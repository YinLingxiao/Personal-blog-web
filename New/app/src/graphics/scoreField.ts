export function scoreField(count: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = (((i * .754877666) % 1) - .5) * 6.52, y = (2 - i % 5) * .2;
    const angle = Math.PI / 18;
    positions.set([x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle), 0], i * 3);
  }
  return positions;
}
