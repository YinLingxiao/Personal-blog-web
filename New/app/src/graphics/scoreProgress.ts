const clamp = (t: number) => Math.max(0, Math.min(1, t));
const span = (progress: number, start: number, length: number) => clamp((progress - start) / length);
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export const CLEF_RISE = 34, NOTE_RISE = 26;

function symbol(t: number, rise: number) {
  return { opacity: smooth(clamp(t / .55)), offset: (1 - easeOut(t)) * rise, stem: smooth(clamp((t - .4) / .6)) };
}

export function scoreProgress(progress: number) {
  const clef = span(progress, .58, .14);
  const notes = [0, 1, 1, 2, 3].map(order => span(progress, .66 + order * .055, .12));
  return {
    staff: smooth(span(progress, .22, .22)),
    clef,
    notes,
    clefMotion: symbol(clef, CLEF_RISE),
    noteMotion: notes.map(t => symbol(t, NOTE_RISE)),
    glint: span(progress, .7, .14),
    fade: 1 - smooth(span(progress, .98, .02)),
  };
}
