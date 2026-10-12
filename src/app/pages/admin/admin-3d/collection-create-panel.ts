import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

export type CreateCollectionLine = 'roupas' | 'joias';

/** Write an input only when IME is idle and the value actually changed. */
export function syncTextInputValue(
  el: HTMLInputElement | undefined,
  value: string,
  composing: boolean,
): void {
  if (!el || composing || el.value === value) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const focused = typeof document !== 'undefined' && document.activeElement === el;
  el.value = value;
  if (!focused || start == null || end == null) return;
  const nextStart = Math.min(start, value.length);
  const nextEnd = Math.min(end, value.length);
  try {
    el.setSelectionRange(nextStart, nextEnd);
  } catch {
    /* some input types reject selection */
  }
}

@Component({
  selector: 'lc-collection-create-panel',
  standalone: true,
  templateUrl: './collection-create-panel.html',
  styleUrl: './collection-create-panel.scss',
})
export class CollectionCreatePanel implements AfterViewInit, OnChanges {
  @ViewChild('nameField') private nameField?: ElementRef<HTMLInputElement>;

  @Input({ required: true }) name = '';
  @Input({ required: true }) line: CreateCollectionLine = 'roupas';
  @Input() error = '';
  @Input() saving = false;
  @Input() sheet = false;
  @Input() x = 24;
  @Input() y = 24;

  @Output() readonly nameChange = new EventEmitter<string>();
  @Output() readonly lineChange = new EventEmitter<CreateCollectionLine>();
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  readonly plateFallback = 'Nova coleção';
  private composing = false;

  ngAfterViewInit(): void {
    this.syncNameField();
    this.focusName();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['name']) this.syncNameField();
  }

  focusName(): void {
    const el = this.nameField?.nativeElement;
    if (!el) return;
    queueMicrotask(() => {
      el.focus({ preventScroll: true });
      el.select();
    });
  }

  onCompositionStart(): void {
    this.composing = true;
  }

  onCompositionEnd(event: CompositionEvent): void {
    this.composing = false;
    this.emitName((event.target as HTMLInputElement).value);
  }

  onName(event: Event): void {
    this.emitName((event.target as HTMLInputElement).value);
  }

  onNameKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (!this.saving) this.save.emit();
  }

  get plateLabel(): string {
    return this.name.trim() || this.plateFallback;
  }

  private emitName(value: string): void {
    this.nameChange.emit(value);
  }

  private syncNameField(): void {
    syncTextInputValue(this.nameField?.nativeElement, this.name, this.composing);
  }
}
