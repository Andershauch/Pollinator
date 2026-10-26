# Preflight før Coolify

Målet er at finde blokeringer, før der bruges tid i Coolify. Gennemgå listen i
denne rækkefølge.

## 1. Appen kan bygges lokalt

- Afhængigheder installerer uden interaktive spørgsmål.
- Typecheck/test/build gennemfører.
- Startkommando og intern port er kendt.
- Production-byggede filer kan starte uden udviklingsserver.

## 2. Healthcheck er meningsfuld

- Ruten er hurtig og skriver ikke data.
- Den svarer `200` kun når appens væsentlige afhængighed virker.
- Den svarer `503` eller `500` på fejl, så Coolify ikke tager en ødelagt
  container i brug.
- Den kan kaldes inde fra containeren på `localhost`.

## 3. Miljøvariable er opdelt

Lav en tabel med **navne og formål**, ikke værdier:

| Navn | Build/runtime | Staging-kilde | Production-kilde |
| --- | --- | --- | --- |
|  |  |  |  |

Kontrollér særligt:

- Forbindelsesstrenge skal være syntaktisk gyldige og uden usynlige mellemrum.
- Secrets med `$` skal markeres som *Literal* i Coolify.
- Et pakke-token bruges kun som BuildKit build-secret og aldrig ved runtime.
- Staging peger aldrig på production-data, medmindre det er et bevidst valg.

## 4. Domæne og rollback er afklaret

- DNS-udbyderen og den person med adgang er kendt.
- Production-domænet er oprettet i Coolify før DNS ændres.
- Den korrekte A- og eventuelle AAAA-record fra Coolify er noteret.
- Den gamle host bevares, til live-testen er gennemført.

## Klar til staging

Først når alle fire afsnit er grønne, oprettes appen i Coolify.
