# Kort brief til næste app

Send dette udfyldt i én besked, før en ny flytning begynder:

```text
App:
Repository:
Nuværende hosting:
Live-domæne:
DNS-udbyder:
Database/filer/auth/mail:
Kernefunktioner der skal testes (maks. tre):
Må Vercel blive stående som rollback i 7 dage? Ja/nej:
```

Det er nok til, at vi først kan afgøre, om flytningen er en ren
hostingflytning eller kræver et særskilt forarbejde.

## Aftalt arbejdsmåde

- Første svar er altid en kort preflight med eventuelle blokeringer.
- Staging gennemføres før production.
- Vi ændrer ikke DNS, før production er teknisk verificeret.
- Vi holder os til flytningens scope. Nye features samles i en separat opgave.
- Ved fejl undersøger vi én observation ad gangen og ændrer kun den relevante
  indstilling før næste deployment.
