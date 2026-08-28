# Authentication and Upload Hardening Design

## Scope

Address three confirmed security findings without changing unrelated application behavior:

1. Prevent clients that reach the backend directly from bypassing login throttling with a forged `X-Forwarded-For` header.
2. Make account suspension and role changes invalidate existing JWT privileges immediately.
3. Restrict image uploads to safe image formats, 5 MB per file, and 10 files per request.

## Trusted proxy boundary

The application will not trust forwarded headers by default. A new explicit environment setting will enable one trusted proxy hop only for the Coolify/Traefik deployment. The production container will expose port 10300 to the container network without publishing it directly on the host, so application traffic reaches Express through the trusted reverse proxy. Local `npm run dev` traffic remains direct and ignores caller-supplied forwarded headers.

Tests will prove that direct requests cannot change the rate-limit identity with `X-Forwarded-For`, while the explicitly enabled one-hop proxy mode still reads the proxy-provided client address.

## Current account authorization

JWT verification will continue to validate the signature and eight-hour expiry. After decoding, the middleware will load the current user by the signed user ID and select only `role` and `isActive`.

- Missing or inactive accounts receive `401 Unauthorized`.
- Active accounts receive the current database role in `req.user`, replacing the stale role claim.
- Invalid or malformed tokens continue to receive the existing generic `401` response.

This adds one indexed user lookup per authenticated API request. The immediate revocation guarantee is preferred over a cache because this is an internal application with roughly 2,400 accounts and correctness is the stated priority.

## Image upload policy

Both Scom and ONU/ATA image endpoints will use one shared Multer configuration:

- Memory storage remains unchanged.
- Maximum file size: 5 MB per file.
- Maximum files: 10 per request.
- Allowed MIME types: `image/jpeg`, `image/png`, and `image/webp`.
- File signatures (magic bytes) will be checked before any object is written to S3, so a forged MIME header is rejected.
- Validation failures return `400`; Multer size/count violations return `413` with a generic message.

The shared policy prevents the two upload routes from drifting apart. Existing stored images and image-reading endpoints are outside this change.

## Verification

Tests will cover:

- Proxy trust disabled by default and enabled only through the explicit setting.
- Forged forwarded IPs cannot reset a direct client's login-rate identity.
- Missing, inactive, and role-changed users after valid JWT verification.
- Accepted JPEG/PNG/WebP signatures.
- Rejected MIME types, forged image content, files larger than 5 MB, and requests containing more than 10 files.

The final gate will run the focused security tests, the complete backend test command introduced for these tests, frontend regression tests, frontend lint, and the production frontend build.
