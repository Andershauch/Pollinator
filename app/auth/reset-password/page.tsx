"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import s from "../sign-in/sign-in.module.css";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invalidToken = searchParams.get("error") === "INVALID_TOKEN" || !token;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Adgangskoden skal være mindst 8 tegn.");
      return;
    }
    if (password !== confirmation) {
      setError("Adgangskoderne er ikke ens.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { error: resetError } = await authClient.resetPassword({ newPassword: password, token: token! });
      if (resetError) {
        setError("Linket er ugyldigt eller udløbet. Bed om et nyt reset-link.");
        return;
      }
      setComplete(true);
    } catch {
      setError("Linket er ugyldigt eller udløbet. Bed om et nyt reset-link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={s.page}>
      <section className={s.card}>
        <div className={s.brand}><span className={s.dot} /> POLLINATOR</div>
        <h1>Vælg ny adgangskode</h1>
        {invalidToken ? (
          <>
            <p className={s.error}>Reset-linket er ugyldigt eller udløbet.</p>
            <div className={s.switcher}><Link href="/auth/forgot-password">Send et nyt reset-link</Link></div>
          </>
        ) : complete ? (
          <>
            <p className={s.notice}>Din adgangskode er ændret. Du kan nu logge ind.</p>
            <div className={s.switcher}><Link href="/auth/sign-in">Gå til login</Link></div>
          </>
        ) : (
          <form onSubmit={submit} className={s.form}>
            <label>
              Ny adgangskode
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label>
              Gentag ny adgangskode
              <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type="password" autoComplete="new-password" minLength={8} required />
            </label>
            {error && <p className={s.error}>{error}</p>}
            <button type="submit" disabled={loading}>{loading ? "Gemmer…" : "Gem ny adgangskode"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
