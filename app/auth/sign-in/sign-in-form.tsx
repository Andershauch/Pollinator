"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import s from "./sign-in.module.css";

type Mode = "sign-in" | "sign-up" | "verify";

function messageFrom(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Noget gik galt. Prøv igen.";
}

export default function SignInForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  function reset(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
  }

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

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: "Pollinator-vært",
    });
    setLoading(false);

    if (signUpError) {
      setError(messageFrom(signUpError));
      return;
    }
    setNotice("Vi har sendt en bekræftelseskode til din e-mail.");
    setMode("verify");
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/email-otp/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: code.trim() }),
    });
    const verification = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(messageFrom(verification));
      return;
    }
    setNotice("E-mailen er bekræftet. Log nu ind.");
    setMode("sign-in");
  }

  const heading = mode === "sign-in" ? "Log ind som vært" : mode === "sign-up" ? "Opret værtsadgang" : "Bekræft din e-mail";

  return (
    <main className={s.page}>
      <section className={s.card}>
        <div className={s.brand}><span className={s.dot} /> POLLINATOR</div>
        <h1>{heading}</h1>
        <p className={s.intro}>
          {mode === "verify"
            ? `Skriv koden, vi sendte til ${email}.`
            : "Deltagere og storskærm behøver ikke login."}
        </p>

        {notice && <p className={s.notice}>{notice}</p>}
        {error && <p className={s.error}>{error}</p>}

        {mode !== "verify" && (
          <form onSubmit={mode === "sign-in" ? signIn : signUp} className={s.form}>
            <label>
              E-mail
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
            </label>
            <label>
              Adgangskode
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} required />
            </label>
            <button type="submit" disabled={loading}>{loading ? "Vent…" : mode === "sign-in" ? "Log ind" : "Opret konto"}</button>
          </form>
        )}

        {mode === "verify" && (
          <form onSubmit={verify} className={s.form}>
            <label>
              Bekræftelseskode
              <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
            </label>
            <button type="submit" disabled={loading}>{loading ? "Vent…" : "Bekræft e-mail"}</button>
          </form>
        )}

        <div className={s.switcher}>
          {mode === "sign-in" && <button type="button" onClick={() => reset("sign-up")}>Har du ikke en konto? Opret en</button>}
          {mode === "sign-up" && <button type="button" onClick={() => reset("sign-in")}>Har du allerede en konto? Log ind</button>}
          {mode === "verify" && <button type="button" onClick={() => reset("sign-in")}>Tilbage til login</button>}
        </div>
      </section>
    </main>
  );
}
