import { test, expect, APIRequestContext } from '@playwright/test';
import { authHeader, buildBooking, CREDENTIALS, getToken } from './helpers';

/**
 * Negative and boundary tests.
 *
 * These assert what a correct booking API should do. Where the demo API behaves
 * wrongly the test is left failing on purpose (see RESULTS.md) instead of being
 * bent to match the defect. Those tests carry the @api-bug tag so CI can report
 * them separately from the core suite; the tag does not skip or soften them.
 */
test.describe('Negative and boundary', () => {
  let token: string;
  const createdIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    token = await getToken(request);
  });

  // Invalid bookings that the API wrongly accepts still need cleaning up.
  test.afterAll(async ({ request }) => {
    for (const id of createdIds) {
      await request.delete(`/booking/${id}`, { headers: authHeader(token) });
    }
  });

  /** Posts a payload that should be refused, remembering the id if the API accepts it anyway. */
  async function postInvalid(request: APIRequestContext, data: unknown) {
    const response = await request.post('/booking', { data });
    if (response.ok()) {
      const body = await response.json().catch(() => null);
      if (body?.bookingid) createdIds.push(body.bookingid);
    }
    return response;
  }

  test('reading a booking id that does not exist returns 404', async ({ request }) => {
    const response = await request.get('/booking/999999999');
    expect(response.status()).toBe(404);
  });

  test('auth with a wrong password does not issue a token', async ({ request }) => {
    const response = await request.post('/auth', {
      data: { username: CREDENTIALS.username, password: 'definitely-wrong' },
    });
    const body = await response.json();
    expect(body.token, 'no token may be issued for bad credentials').toBeUndefined();
  });

  test('auth with a wrong password returns 401', { tag: '@api-bug' }, async ({ request }) => {
    const response = await request.post('/auth', {
      data: { username: CREDENTIALS.username, password: 'definitely-wrong' },
    });
    expect(response.status()).toBe(401);
  });

  test('creating a booking with a required field missing returns 400', { tag: '@api-bug' }, async ({ request }) => {
    const { firstname, ...withoutFirstname } = buildBooking();
    const response = await postInvalid(request, withoutFirstname);
    expect(response.status()).toBe(400);
  });

  test('creating a booking with checkout before checkin returns 400', { tag: '@api-bug' }, async ({ request }) => {
    const response = await postInvalid(
      request,
      buildBooking({ bookingdates: { checkin: '2027-03-10', checkout: '2027-03-01' } }),
    );
    expect(response.status()).toBe(400);
  });

  test('creating a booking with a calendar date that does not exist returns 400', { tag: '@api-bug' }, async ({ request }) => {
    const response = await postInvalid(
      request,
      buildBooking({ bookingdates: { checkin: '2027-02-30', checkout: '2027-03-05' } }),
    );
    expect(response.status()).toBe(400);
  });

  test('creating a booking with a non-date string as checkin returns 400', { tag: '@api-bug' }, async ({ request }) => {
    const response = await postInvalid(
      request,
      buildBooking({ bookingdates: { checkin: 'not-a-date', checkout: '2027-03-05' } }),
    );
    expect(response.status()).toBe(400);
  });

  test('creating a booking with a negative total price returns 400', { tag: '@api-bug' }, async ({ request }) => {
    const response = await postInvalid(request, buildBooking({ totalprice: -100 }));
    expect(response.status()).toBe(400);
  });

  test('a decimal total price is stored without losing the cents', { tag: '@api-bug' }, async ({ request }) => {
    const response = await postInvalid(request, buildBooking({ totalprice: 199.99 }));
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.booking.totalprice).toBe(199.99);
  });

  test('successful delete returns 200 or 204, not 201 Created', { tag: '@api-bug' }, async ({ request }) => {
    const create = await request.post('/booking', { data: buildBooking() });
    const { bookingid } = await create.json();

    const response = await request.delete(`/booking/${bookingid}`, { headers: authHeader(token) });
    expect([200, 204]).toContain(response.status());
  });

  test('deleting a booking that does not exist returns 404', { tag: '@api-bug' }, async ({ request }) => {
    const response = await request.delete('/booking/999999999', { headers: authHeader(token) });
    expect(response.status()).toBe(404);
  });
});
