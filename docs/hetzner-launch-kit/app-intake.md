# App intake

Kopiér denne fil til den konkrete app, udfyld den på forhånd og stop, hvis et
punkt mangler. Det er den eneste information, der skal indsamles, før arbejdet
begynder.

## Identitet

- Repository og gren:
- Nuværende host og rollback-adresse:
- Live-domæne:
- DNS-udbyder:
- Ønsket Coolify-projekt og miljø:

## Teknisk drift

- Framework og startkommando:
- Pakkehåndtering (`npm`, `pnpm`, `yarn`):
- Kræver appen Dockerfile allerede?
- Findes der en `GET /api/healthz`-rute? Hvis nej: hvad kan svare sikkert på,
  at appen og dens vigtigste afhængighed virker?
- Er der private pakker under build?

## Afhængigheder

| Område | Tjeneste | Skal flyttes nu? | Secret-/konfigurationsnavn |
| --- | --- | --- | --- |
| Database |  | Nej / Ja |  |
| Filer |  | Nej / Ja |  |
| Auth |  | Nej / Ja |  |
| Mail |  | Nej / Ja |  |
| Betaling |  | Nej / Ja |  |
| Cron/webhooks |  | Nej / Ja |  |
| Tredjeparts-API'er |  | Nej / Ja |  |

## Afgrænsning

- Det vi flytter nu:
- Det vi bevidst ikke flytter nu:
- Kernetest efter deployment (højst tre):
  1.
  2.
  3.

## Godkendelser før cutover

- Production-secrets er klar: Ja / Nej
- Staging-test er bestået: Ja / Nej
- DNS-adgang er klar: Ja / Nej
- Rollback-ejer og kontaktvej: 
