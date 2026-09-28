import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { VendingMachineService } from '../../services/vending-machine.service';
import { VendingProductService } from '../../services/vending-product.service';
import { ProductService } from '../../../products/services/product.service';
import { VendingMachineResponseDto } from '../../interfaces/vending-machine-response';
import { VendingProductResponseDto } from '../../interfaces/vending-product-response';
import { ProductResponseDto } from '../../../products/interfaces/product-response';

type EditableField = 'productId' | 'capacity' | 'quantity' | 'price' | 'active';
type FilterMode = 'all' | 'low' | 'empty';

interface RowView extends VendingProductResponseDto {
  dirty: boolean;
  productName: string;
  sku: string;
  pct: number;
  low: boolean;
  lineTotal: number;
}

interface Tray {
  label: string;
  rows: RowView[];
}

const LOW_STOCK_RATIO = 0.25;

@Component({
  selector: 'app-vending-planogram',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule],
  templateUrl: './vending-planogram.html',
  styleUrl: './vending-planogram.scss',
})
export class VendingPlanogram implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private vendingMachineService = inject(VendingMachineService);
  private vendingProductService = inject(VendingProductService);
  private productService = inject(ProductService);

  machineId = 0;
  machine = signal<VendingMachineResponseDto | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);

  private rowsRaw = signal<VendingProductResponseDto[]>([]);
  private catalog = signal<ProductResponseDto[]>([]);
  private edits = signal<Record<string, string | number | boolean>>({});

  search = signal('');
  filterMode = signal<FilterMode>('all');
  savedNote = signal(false);

  readonly catalogList = computed(() => this.catalog());

  private allRows = computed<RowView[]>(() => {
    const editsMap = this.edits();
    const catalog = this.catalog();
    return this.rowsRaw().map((base) => {
      const cell = <T,>(field: EditableField): T => {
        const key = base.id + '.' + field;
        return (key in editsMap ? editsMap[key] : (base as unknown as Record<string, unknown>)[field]) as T;
      };
      const productId = Number(cell<number>('productId'));
      const capacity = Number(cell<number>('capacity')) || 0;
      const quantity = Number(cell<number>('quantity')) || 0;
      const price = Number(cell<number>('price')) || 0;
      const active = Boolean(cell<boolean>('active'));
      const dirty = (['productId', 'capacity', 'quantity', 'price', 'active'] as EditableField[])
        .some((field) => (base.id + '.' + field) in editsMap);
      const product = catalog.find((p) => p.id === productId);
      const pct = capacity ? Math.min(100, Math.round((quantity / capacity) * 100)) : 0;
      return {
        ...base,
        productId,
        capacity,
        quantity,
        price,
        active,
        dirty,
        productName: product?.name ?? 'Unknown product',
        sku: product?.sku ?? '—',
        pct,
        low: capacity > 0 && quantity / capacity <= LOW_STOCK_RATIO,
        lineTotal: quantity * price,
      };
    });
  });

  dirtyCount = computed(() => this.allRows().filter((r) => r.dirty).length);

  stats = computed(() => {
    const rows = this.allRows();
    const filled = rows.filter((r) => r.productId > 0).length;
    const low = rows.filter((r) => r.capacity > 0 && r.quantity / r.capacity <= LOW_STOCK_RATIO).length;
    const value = rows.reduce((sum, r) => sum + r.quantity * r.price, 0);
    return {
      slots: rows.length,
      filled,
      empty: rows.length - filled,
      low,
      value,
    };
  });

  trays = computed<Tray[]>(() => {
    const term = this.search().trim().toLowerCase();
    const mode = this.filterMode();
    const visible = this.allRows().filter((r) => {
      const matchesTerm = !term
        || r.slotNumber.toLowerCase().includes(term)
        || r.productName.toLowerCase().includes(term);
      const matchesMode = mode === 'all'
        || (mode === 'low' && r.low)
        || (mode === 'empty' && r.quantity === 0);
      return matchesTerm && matchesMode;
    });
    const groups = new Map<string, RowView[]>();
    for (const row of visible) {
      const label = (row.slotNumber.match(/^[^\d]+/)?.[0] || 'Slots').trim() || 'Slots';
      const group = groups.get(label) ?? [];
      group.push(row);
      groups.set(label, group);
    }
    return Array.from(groups.entries()).map(([label, rows]) => ({
      label: label.length === 1 ? 'Tray ' + label : label,
      rows,
    }));
  });

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = Number(params['id']);
      if (id) {
        this.machineId = id;
        this.loadAll();
      }
    });
  }

  private loadAll(): void {
    this.isLoading.set(true);
    forkJoin({
      machine: this.vendingMachineService.getVendingMachineById(this.machineId),
      rows: this.vendingProductService.getByVendingMachine(this.machineId),
      catalog: this.productService.getAllProducts(),
    }).subscribe({
      next: ({ machine, rows, catalog }) => {
        this.machine.set(machine);
        this.rowsRaw.set(rows);
        this.catalog.set(catalog);
        this.edits.set({});
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error loading planogram:', error);
        this.snackBar.open('Failed to load planogram. Please try again.', 'Close', { duration: 5000 });
        this.router.navigate(['/vending-machines']);
      },
    });
  }

  setCell(rowId: number, field: EditableField, raw: string | boolean): void {
    let value: string | number | boolean = raw;
    if (field === 'price') {
      value = raw === '' ? 0 : Number(raw);
    } else if (field === 'capacity' || field === 'quantity' || field === 'productId') {
      value = raw === '' ? 0 : parseInt(raw as string, 10);
    }
    this.edits.update((edits) => ({ ...edits, [rowId + '.' + field]: value }));
    this.savedNote.set(false);
  }

  onInputChange(rowId: number, field: EditableField, event: Event): void {
    this.setCell(rowId, field, (event.target as HTMLInputElement | HTMLSelectElement).value);
  }

  toggleActive(row: RowView): void {
    this.setCell(row.id, 'active', !row.active);
  }

  fillToCapacity(row: RowView): void {
    this.setCell(row.id, 'quantity', String(row.capacity));
  }

  revertRow(rowId: number): void {
    this.edits.update((edits) => {
      const next = { ...edits };
      for (const key of Object.keys(next)) {
        if (key.split('.')[0] === String(rowId)) {
          delete next[key];
        }
      }
      return next;
    });
  }

  deleteSlot(row: RowView): void {
    if (!confirm(`Delete slot ${row.slotNumber}? This cannot be undone.`)) {
      return;
    }
    this.vendingProductService.deleteVendingProduct(row.id).subscribe({
      next: () => {
        this.snackBar.open('Slot deleted.', 'Close', { duration: 3000 });
        this.loadAll();
      },
      error: (error) => {
        console.error('Error deleting slot:', error);
        this.snackBar.open('Failed to delete slot. Please try again.', 'Close', { duration: 5000 });
      },
    });
  }

  addSlot(): void {
    const slotNumber = prompt('New slot number (e.g. A5):');
    if (!slotNumber) {
      return;
    }
    const firstProduct = this.catalog()[0];
    if (!firstProduct) {
      this.snackBar.open('No products in the catalog to assign.', 'Close', { duration: 4000 });
      return;
    }
    this.vendingProductService.createVendingProduct({
      vendingMachineId: this.machineId,
      slotNumber,
      productId: firstProduct.id,
      capacity: 0,
      quantity: 0,
      price: 0,
      active: true,
    }).subscribe({
      next: () => {
        this.snackBar.open('Slot added.', 'Close', { duration: 3000 });
        this.loadAll();
      },
      error: (error) => {
        console.error('Error adding slot:', error);
        this.snackBar.open('Failed to add slot. Please try again.', 'Close', { duration: 5000 });
      },
    });
  }

  discardAll(): void {
    this.edits.set({});
    this.savedNote.set(false);
  }

  saveAll(): void {
    const dirtyRows = this.allRows().filter((r) => r.dirty);
    if (dirtyRows.length === 0) {
      return;
    }
    this.isSaving.set(true);
    forkJoin(dirtyRows.map((row) => this.vendingProductService.updateVendingProduct(row.id, {
      vendingMachineId: row.vendingMachineId,
      productId: row.productId,
      slotNumber: row.slotNumber,
      capacity: row.capacity,
      quantity: row.quantity,
      price: row.price,
      active: row.active,
    }))).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.savedNote.set(true);
        this.snackBar.open(`Saved ${dirtyRows.length} change${dirtyRows.length > 1 ? 's' : ''}.`, 'Close', { duration: 3000 });
        this.loadAll();
      },
      error: (error) => {
        this.isSaving.set(false);
        console.error('Error saving planogram:', error);
        this.snackBar.open('Failed to save changes. Please try again.', 'Close', { duration: 5000 });
      },
    });
  }
}
