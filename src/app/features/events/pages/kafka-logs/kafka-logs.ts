import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  KafkaEventsService,
  KafkaEventLogEntry
} from '../../services/kafka-events.service';

@Component({
  selector: 'app-kafka-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule],
  templateUrl: './kafka-logs.html',
  styleUrl: './kafka-logs.scss'
})
export class KafkaLogs implements OnInit, OnDestroy {
  private readonly eventsService = inject(KafkaEventsService);
  private readonly snackBar = inject(MatSnackBar);

  logs = signal<KafkaEventLogEntry[]>([]);
  isLoading = signal<boolean>(false);
  isPulling = signal<boolean>(false);
  autoRefresh = signal<boolean>(false);
  lastRefreshTime = signal<Date | null>(null);

  // Filters & Search
  searchTerm = signal<string>('');
  selectedGroup = signal<string>('ALL');
  selectedPartition = signal<string>('ALL');
  selectedWorker = signal<string>('ALL');

  // Selected Log Drawer / Modal
  selectedLog = signal<KafkaEventLogEntry | null>(null);

  private autoRefreshTimer: any = null;

  // Filter options
  availableGroups = computed(() => {
    const set = new Set<string>();
    this.logs().forEach((l) => {
      if (l.consumerGroupId) set.add(l.consumerGroupId);
    });
    return Array.from(set).sort();
  });

  availablePartitions = computed(() => {
    const set = new Set<number>();
    this.logs().forEach((l) => {
      if (l.partitionId !== undefined && l.partitionId !== null) set.add(l.partitionId);
    });
    return Array.from(set).sort((a, b) => a - b);
  });

  availableWorkers = computed(() => {
    const set = new Set<string>();
    this.logs().forEach((l) => {
      if (l.workerName) set.add(l.workerName);
    });
    return Array.from(set).sort();
  });

  // Filtered dataset
  filteredLogs = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const group = this.selectedGroup();
    const partition = this.selectedPartition();
    const worker = this.selectedWorker();

    return this.logs().filter((item) => {
      // Group filter
      if (group !== 'ALL' && item.consumerGroupId !== group) return false;

      // Partition filter
      if (partition !== 'ALL' && String(item.partitionId) !== partition) return false;

      // Worker filter
      if (worker !== 'ALL' && item.workerName !== worker) return false;

      // Search query filter (eventId, message, sourceService, key, topic)
      if (query) {
        const idMatch = item.eventId?.toLowerCase().includes(query);
        const msgMatch = item.message?.toLowerCase().includes(query);
        const srcMatch = item.sourceService?.toLowerCase().includes(query);
        const keyMatch = item.eventKey?.toLowerCase().includes(query);
        const topicMatch = item.topic?.toLowerCase().includes(query);
        const threadMatch = item.threadName?.toLowerCase().includes(query);
        return idMatch || msgMatch || srcMatch || keyMatch || topicMatch || threadMatch;
      }

      return true;
    });
  });

  // Summary statistics
  stats = computed(() => {
    const list = this.logs();
    const uniqueIds = new Set(list.map((l) => l.eventId).filter(Boolean)).size;
    const uniquePartitions = new Set(list.map((l) => l.partitionId)).size;
    const uniqueGroups = new Set(list.map((l) => l.consumerGroupId)).size;

    return {
      total: list.length,
      uniqueEvents: uniqueIds,
      partitions: uniquePartitions,
      groups: uniqueGroups
    };
  });

  ngOnInit(): void {
    this.loadLogs(false);
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadLogs(showToast = true): void {
    this.isLoading.set(true);
    this.eventsService.getHistoricalLogs().subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.logs.set(data || []);
        this.lastRefreshTime.set(new Date());
        if (showToast) {
          this.snackBar.open(`Loaded ${data?.length || 0} historical Kafka event coordinates`, 'OK', {
            duration: 2000
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || err?.message || 'Could not fetch logs from database';
        if (showToast) {
          this.snackBar.open(`Failed to load event logs: ${msg}`, 'Dismiss', { duration: 4000 });
        }
      }
    });
  }

  pullExistingEvents(): void {
    this.isPulling.set(true);
    this.eventsService.pullExistingEvents().subscribe({
      next: (res) => {
        this.isPulling.set(false);
        const msg = `Scan complete: Found ${res.totalMessagesOnBroker} broker message(s). Saved ${res.newlySavedCount} new log(s), ${res.alreadyPresentCount} already existed.`;
        this.snackBar.open(msg, 'OK', { duration: 4500 });
        this.loadLogs(false);
      },
      error: (err) => {
        this.isPulling.set(false);
        const msg = err?.error?.message || err?.message || 'Failed to pull existing events from Kafka';
        this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
      }
    });
  }

  toggleAutoRefresh(): void {
    if (this.autoRefresh()) {
      this.stopAutoRefresh();
      this.snackBar.open('Auto-refresh paused', 'OK', { duration: 1500 });
    } else {
      this.autoRefresh.set(true);
      this.loadLogs(false);
      this.autoRefreshTimer = setInterval(() => this.loadLogs(false), 3000);
      this.snackBar.open('Auto-refresh active (3s interval)', 'OK', { duration: 2000 });
    }
  }

  private stopAutoRefresh(): void {
    this.autoRefresh.set(false);
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  selectLog(item: KafkaEventLogEntry): void {
    this.selectedLog.set(item);
  }

  closeDrawer(): void {
    this.selectedLog.set(null);
  }

  copyText(text: string, label: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.snackBar.open(`Copied ${label} to clipboard!`, 'OK', { duration: 1500 });
  }

  copySelectedJson(): void {
    const item = this.selectedLog();
    if (!item) return;
    this.copyText(JSON.stringify(item, null, 2), 'Record JSON');
  }

  formatTimestamp(val: any): string {
    if (!val) return '—';
    try {
      const num = Number(val);
      const date = !isNaN(num) && num > 10000000000 ? new Date(num) : new Date(val);
      if (isNaN(date.getTime())) return String(val);
      return (
        date.toLocaleTimeString([], { hour12: false }) +
        '.' +
        String(date.getMilliseconds()).padStart(3, '0')
      );
    } catch {
      return String(val);
    }
  }

  formatFullDate(val: any): string {
    if (!val) return '—';
    try {
      const num = Number(val);
      const date = !isNaN(num) && num > 10000000000 ? new Date(num) : new Date(val);
      if (isNaN(date.getTime())) return String(val);
      return date.toLocaleString();
    } catch {
      return String(val);
    }
  }
}
