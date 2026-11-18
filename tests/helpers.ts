import { APIRequestContext, expect } from '@playwright/test';

export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: { checkin: string; checkout: string };
  additionalneeds?: string;
}

/**
 * Public demo credentials, published in the Restful-Booker API docs.
 * They can be overridden through environment variables; nothing secret lives here.
 */
export const CREDENTIALS = {
  username: process.env.BOOKER_USERNAME ?? 'admin',
  password: process.env.BOOKER_PASSWORD ?? 'password123',
};

/** A valid booking. Pass overrides to vary one field per test. Names are fictional. */
export function buildBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    firstname: 'Testa',
    lastname: `Flexride-${Date.now()}`,
    totalprice: 450,
    depositpaid: true,
    bookingdates: { checkin: '2027-03-01', checkout: '2027-03-08' },
    additionalneeds: 'Breakfast',
    ...overrides,
  };
}

export async function getToken(request: APIRequestContext): Promise<string> {
  const response = await request.post('/auth', { data: CREDENTIALS });
  expect(response.status(), 'auth request should succeed').toBe(200);
  const body = await response.json();
  expect(body.token, 'auth response should contain a token').toEqual(expect.any(String));
  return body.token;
}

/** The API expects the token as a cookie, not as a Bearer header. */
export function authHeader(token: string) {
  return { Cookie: `token=${token}` };
}

/** Creates a booking and returns its id. The database resets every 10 minutes, so every test makes its own data. */
export async function createBooking(
  request: APIRequestContext,
  booking: Booking = buildBooking(),
): Promise<number> {
  const response = await request.post('/booking', { data: booking });
  expect(response.status(), 'booking setup should succeed').toBe(200);
  const body = await response.json();
  return body.bookingid;
}

/** Best-effort cleanup so the suite leaves nothing behind on the shared system. */
export async function deleteBooking(request: APIRequestContext, token: string, id: number) {
  await request.delete(`/booking/${id}`, { headers: authHeader(token) });
}
