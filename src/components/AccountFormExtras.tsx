import Link from "next/link";
import { accountMessages as m } from "@/lib/messages";
import own from "./AccountForm.module.css";

/**
 * Det i konto-skjemaene som avhenger av `?neste=` (Story 5.13): det skjulte feltet som sier hvor
 * brukeren sendes etterpå, og lenken til den andre siden. De leses fra adressen og ligger derfor i
 * en egen del som kan strømmes inn, mens selve skjemaet står i den ferdige siden (sak 011: felt
 * som strømmes inn kan bli byttet ut mens brukeren skriver).
 */
export default function AccountFormExtras({
  mode,
  next,
}: {
  mode: "login" | "register";
  /** Allerede kontrollert at det er en sti i appen. */
  next: string;
}) {
  const register = mode === "register";
  const otherHref = `${register ? "/logg-inn" : "/ny-konto"}${
    next === "/" ? "" : `?neste=${encodeURIComponent(next)}`
  }`;
  return (
    <>
      <input type="hidden" name="neste" value={next} />
      <p className={own.switch}>
        {register ? m.haveAccount : m.noAccount}{" "}
        <Link href={otherHref}>{register ? m.login : m.register}</Link>
      </p>
    </>
  );
}
