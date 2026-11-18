import { test, expect } from '@playwright/test';
import { authHeader, Booking, buildBooking, createBooking, deleteBooking, getToken } from './helpers';

/**
 * Core booking lifecycle: auth, create, read, update, access control, delete.
 * Every test creates its own booking in beforeEach and removes it in afterEach,
 * so tests are independent and survive the API's 10-minute data reset.
 */
test.describe('Booking lifecycle', () => {
  let token: string;
  let booking: Booking;
  let bookingId: number;

  test.beforeAll(async ({ request }) => {
    token = await getToken(request);
  });

  test.beforeEach(async ({ request }) => {
    booking = buildBooking();
    bookingId = await createBooking(request, booking);
  });

  test.afterEach(async ({ request }) => {
    await deleteBooking(request, token, bookingId);
  });

  test('auth returns a token for valid credentials', async ({ request }) => {
    const freshToken = await getToken(request);
    expect(freshToken.length).toBeGreaterThan(0);
  });

  test('create booking returns an id and echoes exactly what was sent', async ({ request }) => {
    const payload = buildBooking({ firstname: 'Ada', totalprice: 1234, depositpaid: false });

    const response = await request.post('/booking', { data: payload });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.bookingid).toEqual(expect.any(Number));
    expect(body.booking).toEqual(payload);

    await deleteBooking(request, token, body.bookingid);
  });

  test('read booking by id returns the stored booking', async ({ request }) => {
    const response = await request.get(`/booking/${bookingId}`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(booking);
  });

  test('new booking appears in the booking id list', async ({ request }) => {
    const response = await request.get('/booking', {
      params: { firstname: booking.firstname, lastname: booking.lastname },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toContainEqual({ bookingid: bookingId });
  });

  test('full update (PUT) with a valid token replaces the booking', async ({ request }) => {
    const updated = buildBooking({
      firstname: 'Updated',
      totalprice: 999,
      depositpaid: false,
      bookingdates: { checkin: '2027-04-10', checkout: '2027-04-17' },
      additionalneeds: 'Late checkout',
    });

    const response = await request.put(`/booking/${bookingId}`, {
      headers: authHeader(token),
      data: updated,
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(updated);

    // Confirm the change was persisted, not just echoed back.
    const readBack = await request.get(`/booking/${bookingId}`);
    expect(await readBack.json()).toEqual(updated);
  });

  test('partial update (PATCH) changes only the fields sent', async ({ request }) => {
    const response = await request.patch(`/booking/${bookingId}`, {
      headers: authHeader(token),
      data: { firstname: 'Patched', totalprice: 111 },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ...booking, firstname: 'Patched', totalprice: 111 });
  });

  test('update without a token is rejected and the booking is unchanged', async ({ request }) => {
    const response = await request.put(`/booking/${bookingId}`, {
      data: buildBooking({ firstname: 'Intruder' }),
    });
    // The API answers 403. 401 would be the more accurate code for "no credentials",
    // so either is accepted here; what matters is that the write is refused.
    expect([401, 403]).toContain(response.status());

    const readBack = await request.get(`/booking/${bookingId}`);
    expect(await readBack.json()).toEqual(booking);
  });

  test('update with an invalid token is rejected and the booking is unchanged', async ({ request }) => {
    const response = await request.put(`/booking/${bookingId}`, {
      headers: authHeader('not-a-real-token'),
      data: buildBooking({ firstname: 'Intruder' }),
    });
    expect([401, 403]).toContain(response.status());

    const readBack = await request.get(`/booking/${bookingId}`);
    expect(await readBack.json()).toEqual(booking);
  });

  test('delete without a token is rejected and the booking still exists', async ({ request }) => {
    const response = await request.delete(`/booking/${bookingId}`);
    expect([401, 403]).toContain(response.status());

    const readBack = await request.get(`/booking/${bookingId}`);
    expect(readBack.status()).toBe(200);
  });

  test('delete with an invalid token is rejected and the booking still exists', async ({ request }) => {
    const response = await request.delete(`/booking/${bookingId}`, {
      headers: authHeader('not-a-real-token'),
    });
    expect([401, 403]).toContain(response.status());

    const readBack = await request.get(`/booking/${bookingId}`);
    expect(readBack.status()).toBe(200);
  });

  test('delete with a valid token removes the booking', async ({ request }) => {
    const response = await request.delete(`/booking/${bookingId}`, { headers: authHeader(token) });
    // Only "some 2xx" is asserted here so this functional check is not coupled to the
    // status-code defect, which has its own test in negative-and-boundary.spec.ts.
    expect(response.ok()).toBe(true);

    const readBack = await request.get(`/booking/${bookingId}`);
    expect(readBack.status()).toBe(404);
  });
});
