import { accountMessages as m } from "@/lib/messages";
import EmptyState from "./EmptyState";

/** Lenke til innlogging som sender brukeren tilbake til `next` etterpå. */
export function loginHref(next: string, page: "/logg-inn" | "/ny-konto" = "/logg-inn"): string {
  return `${page}?neste=${encodeURIComponent(next)}`;
}

/**
 * Vises på sider som krever konto (Oppskrifter, Mapper, Favoritter, Handleliste, Legg inn selv)
 * når ingen er logget inn (Story 5.13). Etter innlogging kommer man tilbake til `next`.
 */
export default function LoginRequired({ next }: { next: string }) {
  return (
    <EmptyState
      title={m.requiredTitle}
      description={m.requiredBody}
      action={{ href: loginHref(next), label: m.login }}
      secondaryAction={{ href: loginHref(next, "/ny-konto"), label: m.register }}
    />
  );
}
