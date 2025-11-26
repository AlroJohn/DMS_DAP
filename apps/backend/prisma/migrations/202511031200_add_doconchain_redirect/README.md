# Add DocOnChain Redirect Url Column

Adds the `blockchain_redirect_url` field to `DocumentAdditionalDetails` so the backend can surface the DocOnChain hand-off link after project creation.

> Run `pnpm --filter backend prisma migrate deploy` (or `prisma migrate deploy`) to apply in shared environments.
