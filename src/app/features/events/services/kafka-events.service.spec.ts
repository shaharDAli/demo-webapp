import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { KafkaEventsService } from './kafka-events.service';
import { environment } from '../../../../environments/environment';

describe('KafkaEventsService', () => {
  let service: KafkaEventsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        KafkaEventsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(KafkaEventsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send ping via POST to demo-assets-service', () => {
    const mockResponse = {
      id: 'uuid-1234',
      message: 'test ping',
      sourceService: 'demo-assets-service',
      timestamp: '2026-09-26T12:00:00Z',
    };

    service.sendPing({
      id: 'uuid-1234',
      message: 'test ping',
      sourceService: 'payment-gateway',
      timestamp: 1789668181521,
    }).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne((r) =>
      r.url === `${environment.apiUrl}/assets/kafka/ping` &&
      r.body?.message === 'test ping' &&
      r.method === 'POST'
    );
    req.flush(mockResponse);
  });

  it('should retrieve last received ping via GET from demo-planogram-service', () => {
    const mockResponse = {
      id: 'uuid-1234',
      message: 'test ping',
      sourceService: 'demo-assets-service',
      timestamp: 1774612800000,
    };

    service.getLastReceivedPing().subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/planogram/kafka/ping/last`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
