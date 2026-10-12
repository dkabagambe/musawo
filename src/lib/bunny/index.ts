import crypto from "crypto";

const SIGNING_KEY = process.env.BUNNY_SIGNING_KEY ?? "";
const CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME ?? "iframe.mediadelivery.net";
const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID ?? "";

/**
 * Generate a signed Bunny Stream embed URL with expiry.
 * @param videoId  Bunny Stream video GUID
 * @param expirySeconds  Token valid for N seconds (default 3600)
 */
export function getBunnySignedUrl(
  videoId: string,
  expirySeconds = 3600
): string {
  const expiry = Math.floor(Date.now() / 1000) + expirySeconds;
  const hashableBase = `${SIGNING_KEY}${videoId}${expiry}0`;
  const token = crypto
    .createHash("sha256")
    .update(hashableBase)
    .digest("hex");

  return `https://${CDN_HOSTNAME}/embed/${LIBRARY_ID}/${videoId}?token=${token}&expires=${expiry}`;
}

/**
 * Generate a signed Bunny Stream direct download URL (for audio-only).
 */
export function getBunnyDownloadUrl(
  videoId: string,
  expirySeconds = 3600
): string {
  const expiry = Math.floor(Date.now() / 1000) + expirySeconds;
  const hashableBase = `${SIGNING_KEY}${videoId}${expiry}0`;
  const token = crypto
    .createHash("sha256")
    .update(hashableBase)
    .digest("hex");

  return `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}?token=${token}&expires=${expiry}`;
}
