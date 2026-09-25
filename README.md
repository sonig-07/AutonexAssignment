# Web Verifier

Three functions that check whether a browser agent actually landed on the right page. Each one gives back `{ success, reason, evidence }` ; not just true/false, but proof of what it looked at.

## Setup

```
npm install
npx playwright install chromium
```

## Task 1 : URL Verifier

`verifiers/task1_url.js` → `verifyUrl(finalUrl, constraints)`

Run: `npm run test:task1`

## Task 2 : Live DOM Verifier

`verifiers/task2_dom.js` → `verifyPage(url, checks, options)`

Run: `npm run test:task2` (needs network + chromium installed)

## Task 3 : Snapshot Verifier

`verifiers/task3_snapshot.js` → `verifySnapshot(htmlString, constraints)`

Run: `npm run test:task3`

## Evidence

Every function returns the same shape:

```json
{
  "success": true,
  "reason": "why it passed or failed",
  "evidence": { "...": "the actual values it checked" }
}
```
