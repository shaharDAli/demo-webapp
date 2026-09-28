import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { EventsDashboard } from './events-dashboard';
import { KafkaEventsService } from '../../services/kafka-events.service';

describe('EventsDashboard', () => {
  let mockEventsService: any;

  beforeEach(async () => {
    mockEventsService = {
      sendPing: () =>
        of({
          id: 'test-uuid-1',
          message: 'hello',
          sourceService: 'demo-assets-service',
          timestamp: '2026-09-26T12:00:00Z',
        }),
      getLastReceivedPing: () =>
        of({
          id: 'test-uuid-1',
          message: 'hello',
          sourceService: 'demo-assets-service',
          timestamp: 1774612800000,
        }),
      getConsumerGroups: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [EventsDashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: KafkaEventsService, useValue: mockEventsService },
      ],
    }).compileComponents();
  });

  it('should create the events dashboard component', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should publish a ping event and log the activity', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;
    component.eventMessage.set('Test message');
    component.publishPing();

    expect(component.publishedCount()).toBe(1);
    expect(component.lastPublished()?.id).toBe('test-uuid-1');
    expect(component.logs().length).toBeGreaterThan(0);
    expect(component.logs()[0].direction).toBe('PUBLISHED');
  });

  it('should auto-generate short ID (0-5 chars), UUID message, and service on init', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;

    expect(component.eventId()).toBeTruthy();
    expect(component.eventId().length).toBeLessThanOrEqual(5);
    expect(component.eventMessage()).toBeTruthy();
    expect(component.eventSourceService()).toBeTruthy();
    expect(component.eventTimestamp()).toBeGreaterThan(0);
  });

  it('should generate new UUID message with generateNewMessage()', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;
    const initialMsg = component.eventMessage();

    component.generateNewMessage();
    expect(component.eventMessage()).toBeTruthy();
    expect(component.eventMessage().length).toBe(36); // UUID length
  });

  it('should generate new service with generateNewService()', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;

    component.generateNewService();
    expect(component.eventSourceService()).toBeTruthy();
  });

  it('should generate all fields with generateAll()', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;

    component.generateAll(false);
    expect(component.eventId().length).toBeLessThanOrEqual(5);
    expect(component.eventMessage().length).toBe(36);
    expect(component.eventSourceService()).toBeTruthy();
  });

  it('should reset to sample ping with loadSamplePing()', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;

    component.loadSamplePing();
    expect(component.eventId()).toBe('EV001');
    expect(component.eventMessage()).toBe('Health check ping');
    expect(component.eventSourceService()).toBe('payment-gateway');
  });

  it('should allow configuring batch count and delay seconds', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;

    component.batchCount.set(10);
    component.batchDelaySec.set(5);
    expect(component.batchCount()).toBe(10);
    expect(component.batchDelaySec()).toBe(5);
  });

  it('should stop batch when stopBatch() is called', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;

    component.isBatchRunning.set(true);
    component.stopBatch();
    expect(component.isBatchRunning()).toBeFalsy();
    expect(component.batchProgress()).toBeNull();
  });

  it('should switch between tester tab and guide tab', () => {
    const fixture = TestBed.createComponent(EventsDashboard);
    const component = fixture.componentInstance;

    expect(component.activeTab()).toBe('tester');
    component.activeTab.set('guide');
    expect(component.activeTab()).toBe('guide');
  });
});
