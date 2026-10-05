import { Compartment, EditorState } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { searchKeymap } from '@codemirror/search';
import { tags } from '@lezer/highlight';
import { GFM } from '@lezer/markdown';
import { findSourceBlock, type SourceRange } from '@/lib/editor-preview';

type Block = SourceRange & { element: HTMLElement };
type Anchor = { position: number; fraction: number };
interface Callbacks {
  onChange: (text: string, composing: boolean) => void;
  onCompositionEnd: (text: string) => void;
  onJump: () => void;
}

export class LinkedMarkdownEditor {
  readonly view: EditorView;
  private callbacks: Callbacks;
  private editable = new Compartment();
  private preview: HTMLElement | null = null;
  private previewText = '';
  private documentText: string;
  private highlighted: HTMLElement | null = null;
  private observer: ResizeObserver;
  private frame = 0;
  private pending = new WeakMap<HTMLElement, number>();
  private anchor: Anchor = { position: 0, fraction: 0 };
  private mode: 'caret' | 'scroll' = 'caret';
  private externalChange = false;
  private jumpPosition: number | null = null;
  private layoutPending = false;
  private focusAfterLayout = false;
  private sourceSize = { width: 0, height: 0 };
  private previewSize = { width: 0, height: 0 };

  constructor(host: HTMLElement, text: string, callbacks: Callbacks) {
    this.callbacks = callbacks;
    this.documentText = text;
    this.view = new EditorView({
      parent: host,
      state: EditorState.create({ doc: text, extensions: [
        lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), drawSelection(), history(), markdown({ extensions: [GFM] }),
        EditorView.lineWrapping,
        EditorState.phrases.of({ Find: '查找', Replace: '替换', next: '下一个', previous: '上一个', all: '全部', 'match case': '区分大小写', regexp: '正则表达式', 'by word': '全词匹配', replace: '替换', 'replace all': '全部替换', close: '关闭', 'Go to line': '跳转到行', go: '跳转', 'current match': '当前匹配', 'on line': '所在行' }),
        EditorView.contentAttributes.of({ 'aria-label': 'Markdown', 'aria-multiline': 'true', spellcheck: 'false' }),
        this.editable.of(EditorView.editable.of(true)),
        keymap.of([...searchKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        syntaxHighlighting(HighlightStyle.define([
          { tag: tags.heading, color: 'var(--ink)', fontWeight: '600' },
          { tag: tags.strong, fontWeight: '600' }, { tag: tags.emphasis, fontStyle: 'italic' },
          { tag: [tags.link, tags.url], color: 'var(--body)', textDecoration: 'underline' },
          { tag: [tags.monospace, tags.string], color: 'var(--read)' },
          { tag: [tags.processingInstruction, tags.meta, tags.comment], color: 'var(--meta)' },
        ])),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) this.documentText = update.state.doc.toString();
          if (this.externalChange) return;
          if (update.docChanged) this.callbacks.onChange(this.documentText, update.view.composing);
          if (update.selectionSet || update.docChanged) {
            this.mode = 'caret';
            this.schedule(() => this.followCaret());
          }
        }),
        EditorView.domEventHandlers({
          wheel: () => { this.mode = 'scroll'; },
          touchmove: () => { this.mode = 'scroll'; },
          pointerdown: (event, view) => {
            if (event.clientX >= view.scrollDOM.getBoundingClientRect().right - 16) this.mode = 'scroll';
          },
          scroll: (_event, view) => {
            if (this.ignoreScroll(view.scrollDOM) || this.layoutPending) return;
            if (view.scrollDOM.clientWidth !== this.sourceSize.width || view.scrollDOM.clientHeight !== this.sourceSize.height) {
              this.layoutPending = true;
              this.schedule(() => this.finishLayout());
              return;
            }
            this.schedule(() => {
              if (this.mode === 'caret') { this.anchor = this.sourceAnchor(); this.followCaret(); }
              else this.fromSourceScroll();
            });
          },
          compositionend: (_event, view) => { this.callbacks.onCompositionEnd(view.state.doc.toString()); },
        }),
      ] }),
    });
    this.sourceSize = { width: this.view.scrollDOM.clientWidth, height: this.view.scrollDOM.clientHeight };
    this.observer = new ResizeObserver(() => {
      if (this.view.scrollDOM.clientHeight && (this.view.scrollDOM.clientWidth !== this.sourceSize.width || this.view.scrollDOM.clientHeight !== this.sourceSize.height)) this.layoutPending = true;
      if (this.preview?.clientHeight && (this.preview.clientWidth !== this.previewSize.width || this.preview.clientHeight !== this.previewSize.height)) this.layoutPending = true;
      this.view.requestMeasure();
      this.schedule(() => this.layoutPending ? this.finishLayout() : this.mode === 'caret' ? this.followCaret() : this.restoreAnchor());
    });
    this.observer.observe(this.view.scrollDOM);
  }

  setText(text: string) {
    if (text === this.documentText) return;
    this.externalChange = true;
    this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: text } });
    this.externalChange = false;
  }

  setDisabled(disabled: boolean) { this.view.dispatch({ effects: this.editable.reconfigure(EditorView.editable.of(!disabled)) }); }

  rememberAnchor() { if (this.view.scrollDOM.clientHeight) this.anchor = this.sourceAnchor(); }

  move(host: HTMLElement, focus: boolean) {
    host.append(this.view.dom);
    this.view.requestMeasure();
    this.layoutPending = true;
    this.focusAfterLayout = focus;
    this.schedule(() => this.finishLayout());
  }

  attachPreview(element: HTMLElement, text: string) {
    const textChanged = this.previewText !== text;
    if (this.preview) {
      this.preview.removeEventListener('scroll', this.onPreviewScroll);
      this.preview.removeEventListener('dblclick', this.onDoubleClick);
      this.observer.unobserve(this.preview);
      if (this.preview.firstElementChild) this.observer.unobserve(this.preview.firstElementChild);
    }
    this.preview = element;
    this.previewText = text;
    if (textChanged && this.view.scrollDOM.clientHeight) this.anchor = this.sourceAnchor();
    this.layoutPending = true;
    this.previewSize = { width: element.clientWidth, height: element.clientHeight };
    element.addEventListener('scroll', this.onPreviewScroll);
    element.addEventListener('dblclick', this.onDoubleClick);
    this.observer.observe(element);
    if (element.firstElementChild) this.observer.observe(element.firstElementChild);
    this.view.requestMeasure();
    this.schedule(() => {
      if (this.layoutPending) this.finishLayout();
      if (this.jumpPosition !== null && this.view.scrollDOM.clientHeight) {
        const position = this.jumpPosition;
        this.jumpPosition = null;
        this.view.dispatch({ selection: { anchor: position }, effects: EditorView.scrollIntoView(position, { y: 'center' }) });
        this.view.focus();
      }
      if (this.mode === 'caret') this.followCaret();
      else this.restoreAnchor();
    });
  }

  private schedule(action: () => void) {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(action);
  }

  private finishLayout() {
    this.restoreAnchor();
    if (this.view.scrollDOM.clientHeight) this.sourceSize = { width: this.view.scrollDOM.clientWidth, height: this.view.scrollDOM.clientHeight };
    if (this.preview?.clientHeight) this.previewSize = { width: this.preview.clientWidth, height: this.preview.clientHeight };
    this.layoutPending = false;
    if (this.focusAfterLayout) this.view.focus();
    this.focusAfterLayout = false;
  }

  private blocks(): Block[] {
    if (!this.preview || this.previewText !== this.documentText) return [];
    return Array.from(this.preview.querySelectorAll<HTMLElement>('[data-source-from][data-source-to]'))
      .map((element) => ({ element, from: Number(element.dataset.sourceFrom), to: Number(element.dataset.sourceTo) }));
  }

  private highlight(block?: Block) {
    if (this.highlighted !== block?.element) this.highlighted?.removeAttribute('data-source-active');
    this.highlighted = block?.element ?? null;
    this.highlighted?.setAttribute('data-source-active', '');
  }

  private caretBlock() {
    const position = this.view.state.selection.main.head;
    return findSourceBlock(this.blocks(), position, !this.view.state.doc.lineAt(position).text.trim());
  }

  private followCaret() {
    if (this.previewText !== this.documentText) return;
    const block = this.caretBlock();
    this.highlight(block);
    if (!block || !this.preview?.clientHeight) return;
    const viewport = this.preview.getBoundingClientRect();
    const rect = block.element.getBoundingClientRect();
    if (rect.bottom < viewport.top + 24 || rect.top > viewport.bottom - 24) {
      this.setScroll(this.preview, this.preview.scrollTop + rect.top - viewport.top - 24);
    }
  }

  private setScroll(element: HTMLElement, top: number) {
    const next = Math.max(0, Math.min(top, element.scrollHeight - element.clientHeight));
    if (Math.abs(element.scrollTop - next) < 1) return;
    this.pending.set(element, next);
    element.scrollTop = next;
  }

  private ignoreScroll(element: HTMLElement) {
    const expected = this.pending.get(element);
    this.pending.delete(element);
    return expected !== undefined && Math.abs(element.scrollTop - expected) < 1;
  }

  private sourceY(position: number, end = false) {
    const bounded = Math.max(0, Math.min(position, this.view.state.doc.length));
    const rect = this.view.coordsAtPos(bounded);
    if (rect) return (end ? rect.bottom : rect.top) - this.view.documentTop;
    const line = this.view.lineBlockAt(bounded);
    return end ? line.bottom : line.top;
  }

  private sourceAnchor(): Anchor {
    if (!this.view.scrollDOM.clientHeight) return this.anchor;
    if (this.view.scrollDOM.scrollTop <= 1) return { position: 0, fraction: 0 };
    const y = Math.max(0, this.view.scrollDOM.getBoundingClientRect().top + 24 - this.view.documentTop);
    const line = this.view.lineBlockAtHeight(y);
    const block = findSourceBlock(this.blocks(), line.from, !this.view.state.doc.lineAt(line.from).text.trim());
    if (!block) return { position: line.from, fraction: 0 };
    const start = this.sourceY(block.from);
    const end = this.sourceY(Math.max(block.from, block.to - 1), true);
    return { position: block.from, fraction: Math.max(0, Math.min(1, (y - start) / Math.max(1, end - start))) };
  }

  private fromSourceScroll() {
    this.anchor = this.sourceAnchor();
    this.toPreview(this.anchor);
    this.highlight(this.caretBlock());
  }

  private toPreview(anchor: Anchor) {
    const block = findSourceBlock(this.blocks(), anchor.position);
    if (!block || !this.preview?.clientHeight) return;
    const rect = block.element.getBoundingClientRect();
    const top = this.preview.getBoundingClientRect().top;
    this.setScroll(this.preview, this.preview.scrollTop + rect.top - top + rect.height * anchor.fraction - 24);
  }

  private toSource(anchor: Anchor) {
    if (!this.view.scrollDOM.clientHeight) return;
    const block = findSourceBlock(this.blocks(), anchor.position);
    const start = this.sourceY(block?.from ?? anchor.position);
    const end = this.sourceY(block ? Math.max(block.from, block.to - 1) : anchor.position, true);
    const origin = this.view.documentTop - this.view.scrollDOM.getBoundingClientRect().top + this.view.scrollDOM.scrollTop;
    this.setScroll(this.view.scrollDOM, origin + start + (end - start) * anchor.fraction - 24);
  }

  private restoreAnchor() {
    this.toSource(this.anchor); this.toPreview(this.anchor);
    this.highlight(this.caretBlock());
  }

  private onPreviewScroll = () => {
    if (!this.preview?.clientHeight || this.ignoreScroll(this.preview) || this.layoutPending) return;
    if (this.preview.clientWidth !== this.previewSize.width || this.preview.clientHeight !== this.previewSize.height) {
      this.layoutPending = true;
      this.schedule(() => this.finishLayout());
      return;
    }
    const y = this.preview.getBoundingClientRect().top + 24;
    const blocks = this.blocks();
    const containing = blocks.filter(({ element }) => { const rect = element.getBoundingClientRect(); return rect.top <= y && rect.bottom > y; });
    const block = containing.sort((a, b) => a.to - a.from - (b.to - b.from))[0]
      ?? blocks.filter(({ element }) => element.getBoundingClientRect().top >= y).sort((a, b) => a.element.getBoundingClientRect().top - b.element.getBoundingClientRect().top)[0]
      ?? blocks.at(-1);
    if (!block) return;
    const rect = block.element.getBoundingClientRect();
    this.anchor = { position: block.from, fraction: Math.max(0, Math.min(1, (y - rect.top) / Math.max(1, rect.height))) };
    this.mode = 'scroll';
    this.schedule(() => this.toSource(this.anchor));
  };

  private onDoubleClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || event.target.closest('a,button,input,select,textarea')) return;
    const element = event.target.closest<HTMLElement>('[data-source-from][data-source-to]');
    if (!element || this.previewText !== this.documentText) return;
    event.preventDefault();
    this.jumpPosition = Number(element.dataset.sourceFrom);
    this.mode = 'caret';
    this.callbacks.onJump();
    this.attachPreview(this.preview!, this.previewText);
  };

  destroy() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.preview?.removeEventListener('scroll', this.onPreviewScroll);
    this.preview?.removeEventListener('dblclick', this.onDoubleClick);
    this.view.destroy();
  }
}
