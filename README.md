# FlexRide QA assignment – Part C: API test automation

Automated API tests for the public [Restful-Booker](https://restful-booker.herokuapp.com/apidoc/index.html) demo API, written with Playwright Test and TypeScript.

## Install and run

Requires Node.js 18 or newer. No browser download is needed, because the suite only makes HTTP calls.

```bash
npm ci
npx playwright test
```

Expected outcome today: **13 passed, 9 failed**. The 9 failures are deliberate and each one is an API defect, explained in [RESULTS.md](RESULTS.md). The command therefore exits non-zero.

Other useful commands:

```bash
npx playwright test --grep-invert @api-bug   # core suite only: 13 tests, all pass
npx playwright test --grep @api-bug          # only the tests that expose API defects
npx playwright show-report                   # open the HTML report from the last run
```

## What is covered

| Requirement | Test file | Test |
|---|---|---|
| Get an auth token | `booking-lifecycle.spec.ts` | auth returns a token for valid credentials |
| Create and confirm the response matches | `booking-lifecycle.spec.ts` | create booking returns an id and echoes exactly what was sent |
| Read back by ID | `booking-lifecycle.spec.ts` | read booking by id returns the stored booking |
| Update with a valid token | `booking-lifecycle.spec.ts` | full update (PUT), partial update (PATCH) |
| Update or delete with no or invalid token is rejected | `booking-lifecycle.spec.ts` | four tests: PUT and DELETE, each with no token and with an invalid token |
| Delete and confirm it is gone | `booking-lifecycle.spec.ts` | delete with a valid token removes the booking |
| Negative and boundary tests | `negative-and-boundary.spec.ts` | 11 tests: bad credentials, missing field, invalid dates, price boundaries, missing ids, status codes |

## Design choices

- **Tests create their own data.** The API resets every 10 minutes, so each test creates the booking it needs and deletes it afterwards. No test depends on existing records or on another test.
- **Rejected writes are checked twice.** The unauthorised tests assert the status code and then read the booking back to prove nothing changed. A status code alone would not catch an API that says "forbidden" but applies the change anyway.
- **Defects are not hidden.** Where the API is wrong, the test asserts the correct behaviour and fails. Those tests are tagged `@api-bug` so they can be reported separately; the tag does not skip them.
- **Gentle on the shared system.** One worker, no retries, about 60 requests per run. No load or performance testing.
- **Credentials.** Only the public demo credentials from the API docs are in the repo. They can be overridden with `BOOKER_USERNAME`, `BOOKER_PASSWORD` and `BASE_URL`.

## Continuous integration

[`.github/workflows/api-tests.yml`](.github/workflows/api-tests.yml) runs on every push. The core suite gates the build. The `@api-bug` tests run in a second step that is allowed to fail, so the known defects stay visible in the log without making every build red. The HTML report is uploaded as an artifact.

## With more time

- Validate response bodies against a JSON schema, so a renamed or missing field is caught.
- Cover the `GET /booking` date filters (`checkin`, `checkout`) and `PATCH` without a token.
- Add Basic auth as a second authentication path for update and delete.
- Add more boundaries: very long names, empty strings, zero price, same-day checkin and checkout, wrong data types.
