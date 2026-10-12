import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface AddPieceCandidate {
  slug: string;
  name: string;
}

@Component({
  selector: 'lc-collection-add-piece-panel',
  standalone: true,
  templateUrl: './collection-add-piece-panel.html',
  styleUrl: './collection-add-piece-panel.scss',
})
export class CollectionAddPiecePanel {
  @Input({ required: true }) unitName = '';
  @Input({ required: true }) candidates: AddPieceCandidate[] = [];
  @Input() sheet = false;
  @Input() saving = false;

  @Output() readonly add = new EventEmitter<string[]>();
  @Output() readonly create = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  readonly selected = new Set<string>();

  toggle(slug: string): void {
    if (this.selected.has(slug)) this.selected.delete(slug);
    else this.selected.add(slug);
  }

  confirm(): void {
    if (this.saving || !this.selected.size) return;
    this.add.emit([...this.selected]);
  }
}
