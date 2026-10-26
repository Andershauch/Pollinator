# Cutover-runbook

Brug samme rækkefølge ved hver app. Stop ved første røde punkt; gæt ikke videre.

## A. Staging

1. Opret en Coolify-app fra den aftalte gren.
2. Indsæt kun staging-secrets, én ad gangen.
3. Deploy og bekræft, at containeren er `Running`.
4. Kald healthchecket direkte og bekræft `200`.
5. Udfør højst tre aftalte kernetests.

**Staging er færdig, når:** healthcheck og kernetests er grønne.

## B. Production før DNS

1. Opret production-appen med samme build- og healthcheck-indstillinger.
2. Indsæt production-secrets, én ad gangen.
3. Deploy og bekræft `Running`.
4. Test healthcheck på Coolifys midlertidige adresse.
5. Tilføj det ønskede live-domæne i Coolify.
6. Kontroller, at Coolify viser præcise DNS-records og vent på DNS-match.

**Production er klar til cutover, når:** app, database og HTTPS på det nye
domæne er klar uden at ændre public DNS endnu.

## C. DNS-cutover

1. Erstat den eksisterende record for appens subdomæne med den A-record,
   Coolify angiver. Tilføj/ret AAAA-record, hvis Coolify angiver en.
2. Fjern en gammel CNAME-record for samme navn; A/AAAA og CNAME kan ikke
   eksistere samtidigt.
3. Vent på, at Coolify bekræfter DNS-match og udsteder HTTPS-certifikat.
4. Verificér offentligt:
   - `https://<domæne>/api/healthz` svarer `200`.
   - Appens centrale side åbner.
   - Én brugerrejse, der ikke skriver eller ændrer data, virker.

## D. Rollback

Hvis healthcheck, HTTPS eller kernetesten fejler efter DNS-cutover:

1. Skift DNS-recorden tilbage til den gamle host.
2. Bekræft den gamle healthcheck.
3. Undersøg fejl på staging eller den midlertidige Coolify-adresse.

Slet ikke Vercel-projektet eller de gamle DNS-noter, før minimum syv dages
stabil drift.
