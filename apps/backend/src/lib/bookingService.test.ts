import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBooking, cancelBookingByToken } from './bookingService';
import { getDb } from './firebaseAdmin';
import { createAppointment, getBusySlots, cancelAppointment } from './googleCalendar';
import { sendConfirmationEmail, sendCancellationEmail, sendAdminAlert } from './notifications';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Mocking the dependencies
vi.mock('./firebaseAdmin', () => ({
  getDb: vi.fn(),
  getFirebaseAdminApp: vi.fn(),
}));

vi.mock('./googleCalendar', () => ({
  createAppointment: vi.fn(),
  getBusySlots: vi.fn(),
  cancelAppointment: vi.fn(),
}));

vi.mock('./notifications', () => ({
  sendConfirmationEmail: vi.fn(),
  sendCancellationEmail: vi.fn(),
  sendAdminAlert: vi.fn(),
}));

describe('BookingService', () => {
  const mockDb = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn(),
    set: vi.fn(),
    runTransaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as any).mockReturnValue(mockDb);
  });

  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      const payload = {
        client_name: 'Test Client',
        client_email: 'test@example.com',
        client_phone: '123456789',
        service_id: 'svc123',
        date: '2026-06-20',
        start_time: '10:00',
        end_time: '11:00',
        lang: 'es'
      };

      // Mock service info
      mockDb.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Test Service', duration_min: 60 })
      });

      // Mock busy slots (none)
      (getBusySlots as any).mockResolvedValue({ busy: [] });

      // Mock transaction
      mockDb.runTransaction.mockImplementation(async (cb) => {
        return cb({
          get: vi.fn().mockResolvedValue({ docs: [] }), // No conflicting bookings
          set: vi.fn(),
        });
      });

      // Mock Google Calendar
      (createAppointment as any).mockResolvedValue({ eventId: 'gcal_123' });

      const result = await createBooking(payload);

      expect(result).toHaveProperty('id');
      expect(createAppointment).toHaveBeenCalled();
      expect(sendConfirmationEmail).toHaveBeenCalled();
    });

    it('should throw error if slot is occupied', async () => {
      const payload = {
        client_name: 'Test Client',
        client_phone: '123456789',
        service_id: 'svc123',
        date: '2026-06-20',
        start_time: '10:00',
        end_time: '11:00'
      };

      mockDb.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Test Service', duration_min: 60 })
      });

      // Mock busy slots (occupied)
      (getBusySlots as any).mockResolvedValue({ 
        busy: [{ start: dayjs('2026-06-20T10:30:00'), end: dayjs('2026-06-20T11:30:00') }] 
      });

      await expect(createBooking(payload)).rejects.toThrow('SLOT_OCCUPIED');
    });
  });

  describe('cancelBookingByToken', () => {
    it('should cancel a booking by token', async () => {
      const rawToken = 'test_token';
      const mockBookingData = {
        id: 'booking_123',
        status: 'confirmed',
        googleEventId: 'gcal_123',
        client_email: 'test@example.com',
        client_name: 'Test Client',
        service_name: 'Test Service',
        date: '2026-06-20',
        start_time: '10:00'
      };

      mockDb.get.mockResolvedValueOnce({
        docs: [{ 
          id: 'booking_123',
          data: () => mockBookingData,
          ref: { update: vi.fn().mockResolvedValue({}) }
        }]
      });

      const result = await cancelBookingByToken(rawToken);

      expect(result.success).toBe(true);
      expect(cancelAppointment).toHaveBeenCalledWith('gcal_123');
      expect(sendCancellationEmail).toHaveBeenCalled();
    });

    it('should allow admin to cancel by ID', async () => {
      const bookingId = 'booking_123';
      const mockBookingData = {
        id: 'booking_123',
        status: 'confirmed',
        googleEventId: 'gcal_123'
      };

      // Mock search by ID
      mockDb.get.mockResolvedValueOnce({
        exists: true,
        id: bookingId,
        data: () => mockBookingData,
        ref: { update: vi.fn().mockResolvedValue({}) }
      });

      const result = await cancelBookingByToken(bookingId, true);

      expect(result.success).toBe(true);
      expect(cancelAppointment).toHaveBeenCalledWith('gcal_123');
    });

    it('should throw error if day is closed (maintenance/emergency)', async () => {
      const payload = {
        client_name: 'Test Client',
        client_phone: '123456789',
        service_id: 'svc123',
        date: '2026-06-20',
        start_time: '10:00',
        end_time: '11:00'
      };

      mockDb.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Test Service', duration_min: 60 })
      });

      // Mock busy slots returning the whole day blocked
      (getBusySlots as any).mockResolvedValue({ 
        busy: [{ start: dayjs('2026-06-20T00:00:00'), end: dayjs('2026-06-20T23:59:59') }] 
      });

      await expect(createBooking(payload)).rejects.toThrow('SLOT_OCCUPIED');
    });
  });
});
