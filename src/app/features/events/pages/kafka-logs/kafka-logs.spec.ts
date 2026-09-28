import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { KafkaLogs } from './kafka-logs';
import { KafkaEventsService } from '../../services/kafka-events.service';

describe('KafkaLogs', () => {
  let mockEventsService: any;

  const mockLogs = [
    {
      id: 1,
      topic: 'demo-ping-topic',
      partitionId: 0,
      recordOffset: 10,
      eventKey: 'EV001',
      consumerGroupId: 'planogram-service-group',
      workerName: 'Worker-1',
      threadName: 'planogram-worker-1-0-C-1',
      eventId: 'EV001',
      sourceService: 'demo-assets-service',
      message: 'Health check ping',
      consumedAt: '2026-09-27T10:00:00Z',
      status: 'ACKNOWLEDGED'
    },
    {
      id: 2,
      topic: 'demo-ping-topic',
      partitionId: 2,
      recordOffset: 11,
      eventKey: 'EV002',
      consumerGroupId: 'audit-service-group',
      workerName: 'AuditWorker',
      threadName: 'audit-thread-1',
      eventId: 'EV002',
      sourceService: 'payment-gateway',
      message: 'Payment notification',
      consumedAt: '2026-09-27T10:01:00Z',
      status: 'ACKNOWLEDGED'
    }
  ];

  beforeEach(async () => {
    mockEventsService = {
      getHistoricalLogs: () => of(mockLogs),
      sendPing: () => of({}),
      getLastReceivedPing: () => of({}),
      getConsumerGroups: () => of({ topic: 'demo-ping-topic', groups: [] })
    };

    await TestBed.configureTestingModule({
      imports: [KafkaLogs],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: KafkaEventsService, useValue: mockEventsService }
      ]
    }).compileComponents();
  });

  it('should create the KafkaLogs component and load initial records', () => {
    const fixture = TestBed.createComponent(KafkaLogs);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.logs().length).toBe(2);
    expect(component.stats().total).toBe(2);
    expect(component.stats().uniqueEvents).toBe(2);
  });

  it('should filter logs by consumer group', () => {
    const fixture = TestBed.createComponent(KafkaLogs);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.selectedGroup.set('audit-service-group');
    expect(component.filteredLogs().length).toBe(1);
    expect(component.filteredLogs()[0].consumerGroupId).toBe('audit-service-group');
  });

  it('should filter logs by partition ID', () => {
    const fixture = TestBed.createComponent(KafkaLogs);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.selectedPartition.set('0');
    expect(component.filteredLogs().length).toBe(1);
    expect(component.filteredLogs()[0].partitionId).toBe(0);
  });

  it('should filter logs by search keyword', () => {
    const fixture = TestBed.createComponent(KafkaLogs);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.searchTerm.set('payment');
    expect(component.filteredLogs().length).toBe(1);
    expect(component.filteredLogs()[0].message).toContain('Payment');
  });

  it('should select and clear log drawer', () => {
    const fixture = TestBed.createComponent(KafkaLogs);
    const component = fixture.componentInstance;

    component.selectLog(mockLogs[0] as any);
    expect(component.selectedLog()?.eventId).toBe('EV001');

    component.closeDrawer();
    expect(component.selectedLog()).toBeNull();
  });
});
