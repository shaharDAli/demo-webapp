import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PingEventPayload {
  id: string;
  message: string;
  sourceService: string;
  timestamp: number;
}

export interface PingPublishResponse {
  id: string;
  message: string;
  sourceService: string;
  timestamp: string | number;
}

export interface PingConsumerResponse {
  id?: string;
  message?: string;
  sourceService?: string;
  timestamp?: number | string;
}

export interface ConsumerGroupStatus {
  groupId: string;
  consumerClass: string;
  totalConsumed: number;
  lastPartition: number;
  lastOffset: number;
  lastReceivedAt: string | null;
  lastEvent: PingConsumerResponse | null;
}

export interface ConsumerGroupsResponse {
  topic: string;
  pattern: string;
  consumerCount: number;
  groups: ConsumerGroupStatus[];
}

export interface EventActivityLog {
  id: string;
  direction: 'PUBLISHED' | 'CONSUMED';
  sourceService: string;
  message: string;
  timestamp: Date | string | number;
  status: 'SUCCESS' | 'WAITING' | 'ERROR';
  note?: string;
}

export interface KafkaEventLogEntry {
  id: number;
  topic: string;
  partitionId: number;
  recordOffset: number;
  eventKey?: string;
  recordTimestamp?: number;
  timestampType?: string;
  leaderEpoch?: number;
  consumerGroupId: string;
  workerName?: string;
  consumerClientId?: string;
  threadName?: string;
  eventId?: string;
  sourceService?: string;
  message?: string;
  payloadTimestamp?: number;
  payloadJson?: string;
  headersJson?: string;
  consumedAt: string;
  processingDurationMs?: number;
  status: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class KafkaEventsService {
  private readonly http = inject(HttpClient);
  private readonly assetsApiUrl = `${environment.apiUrl}/assets/kafka`;
  private readonly planogramApiUrl = `${environment.apiUrl}/planogram/kafka`;

  /**
   * Publishes a ping event to demo-ping-topic via demo-assets-service producer (port 8001).
   * Sends the full event JSON payload { id, message, sourceService, timestamp }.
   */
  sendPing(payload: PingEventPayload | string): Observable<PingPublishResponse> {
    const body: PingEventPayload =
      typeof payload === 'string'
        ? {
            id: crypto.randomUUID(),
            message: payload,
            sourceService: 'demo-assets-service',
            timestamp: Date.now(),
          }
        : payload;

    return this.http.post<PingPublishResponse>(`${this.assetsApiUrl}/ping`, body);
  }

  /**
   * Reads the last consumed ping event from demo-planogram-service consumer (port 8002).
   */
  getLastReceivedPing(): Observable<PingConsumerResponse> {
    return this.http.get<PingConsumerResponse>(`${this.planogramApiUrl}/ping/last`);
  }

  /**
   * Fetches the live status and counters of all 3 consumer groups:
   * 1. planogram-service-group
   * 2. audit-service-group
   * 3. notification-service-group
   */
  getConsumerGroups(): Observable<ConsumerGroupsResponse> {
    return this.http.get<ConsumerGroupsResponse>(`${this.planogramApiUrl}/consumer-groups`);
  }

  /**
   * Fetches persisted historical Kafka event logs with exact event coordinates from MySQL database.
   */
  getHistoricalLogs(): Observable<KafkaEventLogEntry[]> {
    return this.http.get<KafkaEventLogEntry[]>(`${this.planogramApiUrl}/logs`);
  }

  /**
   * Pulls existing events from Kafka topic partitions starting from offset 0
   * and saves any missing records into MySQL kafka_event_logs table.
   */
  pullExistingEvents(topic: string = 'demo-ping-topic'): Observable<KafkaPullResult> {
    return this.http.post<KafkaPullResult>(
      `${this.planogramApiUrl}/pull-existing?topic=${encodeURIComponent(topic)}`,
      {}
    );
  }
}

export interface KafkaPullResult {
  status: string;
  topic: string;
  partitionCount: number;
  totalMessagesOnBroker: number;
  newlySavedCount: number;
  alreadyPresentCount: number;
  brokerPartitionOffsets: Record<number, number>;
  newlySavedEventsSummary: Array<Record<string, any>>;
  message: string;
}
