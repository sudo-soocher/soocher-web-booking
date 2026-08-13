"use client";

import { useLayoutEffect } from "react";

/**
 * Adds `doc-app` to <html> while any /doc route is mounted, and removes it on
 * the way out.
 *
 * The doctor stylesheet locks the document for its mobile shell
 * (`position: fixed; overflow: hidden` on html and body). Those rules are scoped
 * to `html.doc-app` precisely so they cannot leak onto the patient pages, which
 * scroll normally — without this class the rules would never apply at all, and
 * without the cleanup a client-side navigation from /doc back to / would leave
 * the patient app unscrollable.
 *
 * A layout effect rather than an effect, so the class is present before the
 * browser paints the first doctor frame.
 */
export function DoctorShellClass() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("doc-app");
    return () => root.classList.remove("doc-app");
  }, []);

  return null;
}
