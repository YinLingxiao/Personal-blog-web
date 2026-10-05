export class PreviewUpdates {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private text = '';
  private commit: (text: string) => void;

  constructor(commit: (text: string) => void) { this.commit = commit; }

  schedule(text: string, composing: boolean) {
    this.text = text;
    if (composing) { this.clear(); return; }
    if (this.timer === undefined) this.timer = setTimeout(() => {
      this.timer = undefined;
      this.commit(this.text);
    }, 120);
  }

  clear() { clearTimeout(this.timer); this.timer = undefined; }
}
