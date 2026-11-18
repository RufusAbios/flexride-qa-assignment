# Results summary

Run on 18 November 2026 at about 10:55 WAT against `https://restful-booker.herokuapp.com`, with `npx playwright test`.

**22 tests: 13 passed, 9 failed.** All 9 failures are, in my judgment, real API defects and not test problems. None were adjusted to pass.

## Passed (13)

All required lifecycle coverage passes:

- Auth returns a token for valid credentials
- Create returns an id and echoes the payload exactly
- Read by id returns the stored booking
- New booking appears in the id list when filtered by name
- PUT with a valid token replaces the booking, and the change is persisted
- PATCH with a valid token changes only the fields sent
- PUT with no token, and with an invalid token, is rejected and the booking is unchanged
- DELETE with no token, and with an invalid token, is rejected and the booking still exists
- DELETE with a valid token removes the booking, and a later read returns 404
- Reading an id that does not exist returns 404
- Auth with a wrong password does not issue a token

## Failed (9), all believed to be real API bugs

Ordered by how much they would matter in a real booking product.

| # | Test | Expected | Actual | Why it matters |
|---|---|---|---|---|
| 1 | Checkout before checkin | 400 | 200, booking created with checkin `2027-03-10`, checkout `2027-03-01` | An impossible stay is accepted. Pricing, availability and reporting downstream all get nonsense. |
| 2 | Non-date string as checkin | 400 | 200, booking stored with checkin `"0NaN-aN-aN"` | Corrupt data is written to the database and returned to clients. |
| 3 | Calendar date that does not exist (`2027-02-30`) | 400 | 200, silently stored as `2027-03-02` | The customer's date is changed without telling them. They would turn up on the wrong day. |
| 4 | Decimal total price (`199.99`) | stored as `199.99` | 200, stored as `199` | Money is silently truncated. On a payments product this is a reconciliation defect. |
| 5 | Negative total price (`-100`) | 400 | 200, booking created with `-100` | No lower bound on a money field. |
| 6 | Required field missing (`firstname`) | 400 with a validation message | 500 `Internal Server Error` | The server crashes on bad input instead of validating it, and the client gets no usable error. |
| 7 | Auth with a wrong password | 401 | 200 with body `{"reason":"Bad credentials"}` | Clients and monitoring that rely on status codes see a failed login as a success. No token is issued, so this is not an access problem. |
| 8 | Successful delete | 200 or 204 | 201 `Created` | Wrong status code for a delete. Low impact, but misleading. |
| 9 | Delete of an id that does not exist | 404 | 405 `Method Not Allowed` | Wrong status code. Low impact. |

## Observations that did not fail a test

- Unauthorised update and delete return **403** where **401** would be more accurate for missing or invalid credentials. The tests accept either code, because the important behaviour (the write is refused and the data is unchanged) is correct. I would raise it as a low-priority defect.
- The API is a deliberately buggy practice system, so the defects above are expected to be stable. If any of the 9 start passing, the API has changed and the `@api-bug` tag should be removed from that test.

## Not covered in the timebox

See "With more time" in the [README](README.md).
