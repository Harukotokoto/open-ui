/** 見た目やショートカットの表記を変えるためのOSの区別。 */
export type Platform = "mac" | "other";

/** User-Agentから、macOSで動いているかを判定する。 */
export function detectPlatform(userAgent: string): Platform {
  return /Macintosh|Mac OS X/.test(userAgent) ? "mac" : "other";
}

/** いま動いているOS。 */
export const platform: Platform =
  typeof navigator === "undefined"
    ? "other"
    : detectPlatform(navigator.userAgent);
