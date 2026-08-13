/**
 * Demo / QA phone numbers whose OTP is always `123456`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY: this is OFF unless `ALLOW_TEST_OTP=true` is set in the environment.
 * Anyone who knows a number on this list can sign in as it with a fixed code, so
 * it must never be enabled on a deployment holding real patient data.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Why these numbers: a real Indian mobile is ten digits beginning 6, 7, 8 or 9.
 * These begin with 5, so the range can never be allocated to a live subscriber
 * and cannot collide with a real user's account. The `555` echoes the usual
 * fiction convention, which makes them obvious in logs and screenshots.
 *
 * Only the *send* step is special-cased: the code is still written to the
 * `phoneOtps` document, so expiry, the five-attempt limit and the transactional
 * check-and-burn in verify-otp all behave exactly as they do for a real number.
 * The only thing skipped is the outbound WhatsApp message.
 */

export const TEST_OTP_CODE = "123456";

export const TEST_OTP_NUMBERS: readonly string[] = [
  "+915550000001",
  "+915550000002",
  "+915550000003",
  "+915550000004",
  "+915550000005",
  "+915550000006",
  "+915550000007",
  "+915550000008",
  "+915550000009",
  "+915550000010",
];

/** True only when test numbers are explicitly enabled for this environment. */
export function testOtpEnabled(): boolean {
  return process.env.ALLOW_TEST_OTP === "true";
}

/** True when `e164` should bypass the real OTP send and use TEST_OTP_CODE. */
export function isTestOtpNumber(e164: string): boolean {
  return testOtpEnabled() && TEST_OTP_NUMBERS.includes(e164);
}
