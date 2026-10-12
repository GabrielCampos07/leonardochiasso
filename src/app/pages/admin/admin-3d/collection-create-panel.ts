import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

export type CreateCollectionLine = 'roupas' | 'joias';

@Component({
  selector: 'lc-collection-create-panel',
  standalone: true,
  templateUrl: './collection-create-panel.html',
  styleUrl: './collection-create-panel.scss',
})
export class CollectionCreatePanel implements AfterViewInit {
  @ViewChild('nameField') private nameField?: ElementRef<HTMLElement>;

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

  ngAfterViewInit(): void {
    this.focusName();
  }

  focusName(): void {
    const el = this.nameField?.nativeElement;
    if (!el) return;
    queueMicrotask(() => {
      el.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }

  onName(event: Event): void {
    this.nameChange.emit((event.target as HTMLElement).textContent ?? '');
  }

  onNameKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!this.saving) this.save.emit();
    }
  }

  get plateLabel(): string {
    return this.name.trim() || this.plateFallback;
  }
}
