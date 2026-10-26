# Hetzner Launch Kit

En fælles, genbrugelig proces for at flytte en webapp fra Vercel til Coolify på
Hetzner. Formålet er at gøre hver flytning forudsigelig: staging først,
production bagefter og DNS sidst.

Denne pakke indeholder ingen adgangskoder, tokens eller kundedata. Den bruges
som udgangspunkt for hver ny app.

## Hvad pakken løser

- Den afgrænser flytningen til hosting, medmindre en afhængighed kræver andet.
- Den gør nødvendige afhængigheder synlige, før der oprettes noget i Coolify.
- Den bruger samme helbredskontrol og samme testforløb hver gang.
- Den bevarer den nuværende hosting som rollback, indtil det nye live-domæne
  er testet.

## Standardforløb

1. Udfyld [app-intake.md](app-intake.md) for den konkrete app.
2. Lav en lokal preflight med [preflight-checklist.md](preflight-checklist.md).
3. Kopiér den relevante skabelon fra `templates/` ind i appens repository og
   tilpas kun de markerede punkter.
4. Opret staging i Coolify og læg kun staging-hemmeligheder ind.
5. Kør den korte staging-test i [cutover-runbook.md](cutover-runbook.md).
6. Opret production med de samme indstillinger og production-hemmeligheder.
7. Flyt DNS, når production-healthcheck og kernetest er grønne.
8. Behold den gamle hosting som rollback i mindst syv dage.

## Regler, der sparer tid

- **Én ændring, én deployment, ét resultat.** Ret ikke DNS, secrets og kode
  samtidig.
- **Ingen browser-clipboard til forbindelsesstrenge.** Hent dem fra kilden,
  valider dem og indsæt dem direkte i den ene destination.
- **Kun nødvendige secrets.** Brug `runtime` for app-hemmeligheder og
  `build-time` for eksempelvis GitHub Packages-token.
- **Hosting først.** Auth, mail, filflytning og UX-forbedringer er egne
  opgaver, medmindre appen ikke kan starte uden dem.
- **Staging og production skal have hver sine secrets.** Del aldrig cookies,
  databaser eller auth-domæner mellem miljøerne ved en fejl.

## Pollinator som reference

Pollinator er den første referenceflytning. Den endelige løsning bruger:

- Coolify på Hetzner til Next.js-containeren
- Neon til database
- Vercel Blob fortsat til filer
- GitHub som kilde og deployment-trigger

Den konkrete app-dokumentation ligger i
[../Pollinator-Hetzner-trin-1.md](../Pollinator-Hetzner-trin-1.md).
