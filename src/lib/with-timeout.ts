/**
 * Bounds a promise that has no timeout of its own.
 *
 * The Firestore JS SDK's `getDoc()` does not time out on a stalled connection
 * — if the underlying network request never resolves, the promise never
 * settles. Observed directly on a simulator: the SDK's connection stalled for
 * 57 seconds, silently re-resolved DNS, then stalled again — with nothing
 * timing out, `/native-auth` and `/doc/native-auth` sat on their "Signing in"
 * loader indefinitely, no error, no way to retry short of force-closing the
 * app. Wrapping every such call turns an unbounded hang into a bounded one
 * that reaches the existing error UI.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Request timed out"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
