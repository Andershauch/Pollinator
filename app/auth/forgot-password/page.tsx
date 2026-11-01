"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import s from "../sign-in/sign-in.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (requestError) {
        setError("Vi kunne ikke starte nulstillingen. Prøv igen.");
        return;
      }
      // The same message avoids revealing whether an address has an account.
      setSent(true);
    } catch {
      setError("Vi kunne ikke starte nulstillingen. Prøv igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={s.page}>
      <section className={s.card}>
        <div className={s.brand}><span className={s.dot} /> POLLINATOR</div>
        <h1>Glemt adgangskode?</h1>
        <p className={s.intro}>Indtast din værts-e-mail. Hvis kontoen findes, sender vi et sikkert reset-link.</p>
        {sent ? (
          <p className={s.notice}>Tjek din e-mail for et reset-link. Linket udløber automatisk.</p>
        ) : (
          <form onSubmit={submit} className={s.form}>
            <label>
              E-mail
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
            </label>
            {error && <p className={s.error}>{error}</p>}
            <button type="submit" disabled={loading}>{loading ? "Sender…" : "Send reset-link"}</button>
          </form>
        )}
        <div className={s.switcher}><Link href="/auth/sign-in">Tilbage til login</Link></div>
      </section>
    </main>
  );
}
