const clamp = (t: number) => Math.max(0, Math.min(1, t));
const span = (progress: number, start: number, length: number) => clamp((progress - start) / length);
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export const MARK_RISE = 4;

// 复刻 BrandMark 的「月托星升」：新月托起 → 星芒升起 → 顶部光芒提锋落定，由滚动进度驱动
export function markProgress(progress: number) {
  const moon = span(progress, .42, .16);
  const star = span(progress, .5, .16);
  const ray = span(progress, .58, .18);
  const rayLift = ray < .65 ? MARK_RISE - (MARK_RISE + 2) * easeOut(ray / .65) : 2 * (smooth((ray - .65) / .35) - 1);
  return {
    moon: { opacity: smooth(moon), offset: (1 - easeOut(moon)) * MARK_RISE, rotate: (1 - easeOut(moon)) * 3 },
    star: { opacity: smooth(star), offset: (1 - easeOut(star)) * MARK_RISE, scale: .96 + .04 * easeOut(star) },
    ray: { opacity: smooth(ray), offset: rayLift },
    glint: span(progress, .74, .14),
    fade: 1 - smooth(span(progress, .98, .02)),
  };
}
