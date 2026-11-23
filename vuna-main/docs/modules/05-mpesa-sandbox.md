# Module 5: M-Pesa STK Push (Daraja sandbox)

Status: **plan, waiting for approval**. Branch `refine`. PRD stories: PAY-1 (real prompt), PAY-3 (refund records). Business rules: `docs/business-rules.md` §3.

## Goal
Replace the simulated payment with a real M-Pesa Express (STK Push) request on Safaricom's **sandbox**: the buyer gets a prompt on their phone, Safaricom calls our backend back, and the order is marked paid only when Safaricom confirms. Switching to live later is a change of environment settings, not code.

## Scope

### Backend
| Change | Details |
|---|---|
| `api/mpesa.py` | Daraja client: OAuth token (cached until it expires), STK Push request (password = shortcode + passkey + timestamp), STK status query. Sandbox or production base URL from `MPESA_ENV` |
| `MpesaPayment` model | One row per prompt: checkout, phone, amount, `MerchantRequestID`, `CheckoutRequestID`, status (`requested`, `paid`, `failed`, `cancelled`, `timeout`), M-Pesa receipt number, result code and description, raw callback stored for audit |
| `POST /api/checkouts/{id}/pay/` | Now starts an STK Push for the amount currently payable (whole KSh, rounded up) to the buyer's phone (or a phone they type). Returns the payment id. Simulated mode stays when `MPESA_ENV` is not set (local development and tests) |
| `POST /api/payments/mpesa/callback/{token}/` | Public endpoint Safaricom calls. A long secret token in the URL, plus matching `CheckoutRequestID` and amount. Processes each callback exactly once. On success marks the checkout lines paid (same rules as today); on failure records the reason |
| `GET /api/payments/{id}/` | Buyer polls status. If no callback after 60 seconds, the backend asks Safaricom with an STK status query |
| Phone | Defaults to the buyer's account phone; can be changed per payment |
| Tests | Daraja calls mocked: success, wrong PIN / cancelled, timeout, duplicate callback, amount mismatch, wrong token |

### Web
| Change | Details |
|---|---|
| M-Pesa dialog | "Send payment request" → real prompt; the dialog waits, polling every 3 s for up to 2 minutes, then shows paid, failed ("You cancelled the prompt", "Wrong PIN", …) or "still waiting, check your phone" with a retry |
| Phone field | Pre-filled with the buyer's phone, editable |
| Labels | "Test payment (sandbox)" while `MPESA_ENV=sandbox` |

## Out of scope
Farmer payouts by B2C (needs the driver pickup step, Module 9, and a B2C sandbox setup), real refunds by M-Pesa reversal (refunds stay recorded for an admin to send by hand), production go-live (needs your paybill/till and Safaricom approval).

## What you need to do (about 15 minutes)
1. Create an account at **developer.safaricom.co.ke** (Daraja) and sign in.
2. **My Apps → Create new app**, tick **M-Pesa Express Sandbox** (also called Lipa Na M-Pesa Sandbox), and create it.
3. Open the app and copy the **Consumer Key** and **Consumer Secret**.
4. Open **APIs → M-Pesa Express → Simulate** (or the Test Credentials page) and copy the sandbox **Business Shortcode** (174379) and **Passkey**.
5. Add these on **Render** (not in chat, not in code): `MPESA_ENV=sandbox`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_TOKEN` (any long random string; I'll show how to generate one).
6. Tell me when they're set. I'll never need to see the values.

For local testing I use the simulated mode, so nothing above blocks building.

## Open questions (my recommendation in brackets)
1. Let buyers pay from a different phone than their account phone? [Yes, pre-filled and editable]
2. Amounts with cents (e.g. KSh 1,200.50): M-Pesa only takes whole shillings. Round up the charge? [Yes, and show the rounded amount before sending]
