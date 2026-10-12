import { Component, EventEmitter, Input, Output } from '@angular/core';

export type CreateCollectionLine = 'roupas' | 'joias';

@Component({
  selector: 'lc-collection-create-panel',
  standalone: true,
  templateUrl: './collection-create-panel.html',
  styleUrl: './collection-create-panel.scss',
})
export class CollectionCreatePanel {
  @Input({ required: true }) name = '';
  @Input({ required: true }) line: CreateCollectionLine = 'roupas';
  @Input() error = '';
  @Input() saving = false;
  @Input() x = 24;
  @Input() y = 24;

  @Output() readonly nameChange = new EventEmitter<string>();
  @Output() readonly lineChange = new EventEmitter<CreateCollectionLine>();
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  onName(event: Event): void {
    this.nameChange.emit((event.target as HTMLInputElement).value);
  }
}
