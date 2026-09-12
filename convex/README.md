# Sutra Convex functions

Anonymous studio persistence for job searchers.

Public deployment URL (Next.js `NEXT_PUBLIC_CONVEX_URL`):

`https://energized-akita-832.eu-west-1.convex.cloud`

That host (`energized-akita-832`, EU West) has `studio:getBySession` and `studio:saveSnapshot`. Deploy with `CONVEX_DEPLOY_KEY` in gitignored `.env.local` via `npx convex deploy`.

Never commit deploy keys. Partner API keys do not belong in Convex.

Stored per `sessionId` (browser): dossier, last run (jobs, proof, pitch, traces, logs), optional portrait in file storage, tailored-CV metadata.
