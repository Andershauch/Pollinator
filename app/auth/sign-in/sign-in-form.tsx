"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import Link from "next/link";
import s from "./sign-in.module.css";

function messageFrom(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Noget gik galt. Prøv igen.";
}

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/host",
      });

      if (signInError) {
        setError(messageFrom(signInError));
        return;
      }

      if (!data) {
        setError("Login kunne ikke bekræftes. Prøv igen.");
        return;
      }

      // A full navigation ensures the newly issued session cookie is included
      // when the protected host area is loaded for the first time.
      window.location.assign("/host");
    } catch (signInError) {
      setError(messageFrom(signInError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={s.page}>
      <section className={s.card}>
        <div className={s.brand}><span className={s.dot} /> POLLINATOR</div>
        <h1>Log ind som vært</h1>
        <p className={s.intro}>Værtsadgang gives af administratoren. Deltagere og storskærm behøver ikke login.</p>

        {error && <p className={s.error}>{error}</p>}

        <form onSubmit={signIn} className={s.form}>
          <label>
            E-mail
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Adgangskode
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" minLength={8} required />
          </label>
          <button type="submit" disabled={loading}>{loading ? "Vent…" : "Log ind"}</button>
        </form>
        <div className={s.switcher}>
          <Link href="/auth/forgot-password">Glemt adgangskode?</Link>
        </div>
      </section>
    </main>
  );
}
