# Reliability Logs

`reliability.jsonl` is generated during local development by the `/api/dev-log` route. Each line is a sanitized JSON record for a field, module, or app error, an offline transition, or a reconnect.

Production builds reject log writes. Do not place credentials, request payloads, or stack traces in this log.
