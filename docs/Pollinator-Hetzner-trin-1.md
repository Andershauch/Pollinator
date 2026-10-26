# Pollinator: trin 1 — kortlægning før Hetzner-flytning

Status: afsluttet 25. oktober 2026. Dette dokument beskriver den eksisterende
drift og de beslutninger, der skal fastholdes, før kode og infrastruktur ændres.

## Migrationsbeslutning

Flyt først selve Next.js-applikationen til Coolify på Hetzner. Behold Neon som
database og Vercel Blob som filopbevaring i den første production-migration.
Det gør flytningen reversibel og undgår en samtidig dataflytning. Vercel skal
blive stående som rollback-mulighed, indtil staging og production på Hetzner er
testet.

Vercel Blob kan erstattes senere, men det er et selvstændigt arbejde: både den
almindelige app og Google Slides-tilføjelsen bruger det direkte.

## Repository og drift i dag

| Område | Nuværende løsning |
| --- | --- |
| Kildekode | `github.com/Andershauch/Pollinator`, gren `master` |
| App | Next.js 16 / React 19 / TypeScript |
| Start | `npm run build` og `npm run start` (`next start`) |
| Nuværende hosting | Vercel-projektet `pollinator` |
| Live-domæne | `https://pollinator.hansendjurhuus.dk` |
| Vercel-standarddomæne | `https://pollinator-nine.vercel.app` |
| Seneste production-release | commit `47efa301d139e00c915b57da799e6e69c3a59fc2` på `master` |
| Production healthcheck | `GET /api/healthz` bekræfter databaseforbindelse |
| CI | GitHub Actions ved push/PR til `master`: typecheck, test og build |
| Planlagte jobs | Ingen fundet |

Vercel beskytter ikke de to kendte domæner med SSO, men beskytter øvrige
deployment-adresser. Det er ikke en applikationslogin-løsning.

## Data og filopbevaring

### Database

- Lakebase Postgres hos Neon, projektet `pollinator` i `aws-eu-central-1`.
- Appen bruger kun `DATABASE_URL` med `@neondatabase/serverless`.
- Den primære branche hedder `production`; skemaet er i `db/schema.sql`.
- Databasen indeholder workshops, spørgsmål, svar, ord, fritekstsvar og
  rangeringer. Der er ingen app-brugere, passwords eller auth-tabeller.
- Neon viser ca. 32 MB logisk data. En aktuel production-healthcheck svarer
  korrekt.

Neon viser samtidig den primære branchestatus som `archived`. Det skal afklares
før migrationen, fordi den aktuelle healthcheck stadig lykkes; vi må ikke
ændre databaseopsætning eller antage en ny forbindelse uden at forstå den
forskel.

### Filer

- Billeder og videoer ligger i Vercel Blob.
- Appen bruger `BLOB_READ_WRITE_TOKEN`; upload-endpointet udsteder tidsbegrænset
  klientadgang til upload.
- Den almindelige app kan uploade op til 200 MB direkte til Blob.
- Google Slides-tilføjelsen uploader også direkte til
  `https://vercel.com/api/blob/` efter at have fået en klienttoken fra appen.

Ved første Hetzner-release fortsætter den nye app derfor med den samme
`BLOB_READ_WRITE_TOKEN`. En senere filflytning kræver både kopiering af de
eksisterende medier og ændring af direkte Blob-upload i Google Slides.

## Integrationer og URLs

| Integration | Hvad den bruger | Hvad der skal ændres ved domæneskift |
| --- | --- | --- |
| Google Slides | Pollinator-API, QR-endpoint og Vercel Blob-upload | `BASE` er stadig sat til Vercels standarddomæne; skift til staging/live-domæne efter test |
| Google Apps Script (serverdel) | `https://pollinator.hansendjurhuus.dk` | Beholdes, hvis live-domænet flyttes DNS-mæssigt til Hetzner |
| Browser-klienter | Relative `/api/...`-kald | Ingen ændring ved beholdt live-domæne |
| QR-koder | `https://pollinator.hansendjurhuus.dk` | Beholdes, hvis live-domænet bevares |

Appen har bred CORS på sine API-ruter, da Apps Script-integrationen kalder den
fra Google. Det skal bevares eller erstattes af en eksplicit tilladelsesliste,
når integrationerne er testet fra staging.

## Auth og e-mail

Der er i dag ingen auth- eller e-mailpakke i Pollinator. Facilitatorrettigheder
er i praksis knyttet til kendskab til en sessionskode, og deltagere bruger kun
en lokal browsernøgle til at begrænse dobbelte svar.

Pollinator skal bruge de fælles pakker, der allerede er vedligeholdt i de
separate projekter:

- **`@andershauch/auth`** fra `Auth Plugin`: ensartet Neon Auth-integration
  med e-mail/password, verificering, password-reset, Google-login og
  server-side sessions.
- **`@andershauch/mail`** fra `SMTP Plugin`: ensartet afsendelse af
  Pollinators egne transaktionelle e-mails via Resend og
  `mail.hansendjurhuus.dk`.

De to har forskellige opgaver. Neon Auth ejer verificerings- og
password-reset-mails; før production skal Neon Auth derfor konfigureres med
sin egen SMTP-forbindelse. Mail-pakken bruges af selve appen, eksempelvis til
invitationer, administratorbeskeder eller andre app-specifikke e-mails.

Da Pollinator ikke har eksisterende brugere eller login, er der ingen
brugerkonti, sessions eller passwords at migrere.

Før trin 2 skal denne produktbeslutning være eksplicit: Auth skal beskytte
facilitator-/admin-adgang, men deltagelse med sessionskode skal fortsat være
uden login. Offentlig tilmelding, invitationer, Google-login og e-mailflow kan
holdes ude af den første Hetzner-release, medmindre de ønskes som et samlet
feature-release.

## Miljøvariable til Coolify i første release

| Variabel | Formål | Kilde |
| --- | --- | --- |
| `DATABASE_URL` | Forbindelse til eksisterende Neon-productiondatabase | Eksisterende Vercel production-secret |
| `BLOB_READ_WRITE_TOKEN` | Fortsat adgang til eksisterende Vercel Blob-filer og uploads | Eksisterende Vercel production-secret |

`BLOB_STORE_ID` og `BLOB_WEBHOOK_PUBLIC_KEY` er Vercel Blob-projektmetadata;
de bruges ikke direkte af applikationskoden. De skal ikke kopieres, medmindre
en konkret uploadtest viser et behov.

## Afgrænsning for næste trin

Trin 2 kan begynde med en Dockerfile, Compose/Coolify-konfiguration,
`/healthz`-healthcheck og en `.env.example` med de to nødvendige variable.
Den efterfølgende auth-/mail-implementering skal anvende de to fælles pakker,
ikke en ny projekt-specifik løsning. Det skal ikke indeholde en database- eller
Blob-migrering.

## Trin 2-status

Den lokale containerklargøring er begyndt 25. oktober 2026. Dockerfile,
healthcheck og miljøskabelon laves før der oprettes noget i Coolify. Auth og
mail aktiveres først i staging, efter at branchens Neon Auth-adresse, SMTP og
de nødvendige trusted domains er klar.

Containeren er testet lokalt: den starter som forventet, og healthchecket
returnerer `503` uden en databaseforbindelse. Det er den korrekte adfærd før
Coolify får staging-secrets.

Auth- og mail-pakkerne består deres lokale kvalitetstjek. Begge pakker blev
udgivet som version `0.1.0` den 25. oktober 2026 og er verificeret i GitHub
Packages. Coolify skal senere få en separat, kun-læse
GitHub Packages-token som build-time-variablen `NPM_TOKEN`; den må ikke blive
en runtime-variabel eller ligge i repositoryet.
