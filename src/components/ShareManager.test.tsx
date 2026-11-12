// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Share } from "@/server/services/share-service";
import ShareManager from "./ShareManager";

afterEach(cleanup);

const mine: Share[] = [
  { id: 1, email: "per@eksempel.no", status: "pending", ownerId: 1 },
  { id: 2, email: "kari@eksempel.no", status: "accepted", ownerId: 1 },
];
const theirs: Share[] = [
  { id: 3, email: "ola@eksempel.no", status: "pending", ownerId: 5 },
  { id: 4, email: "liv@eksempel.no", status: "accepted", ownerId: 6 },
];

function setup(overrides: Partial<Parameters<typeof ShareManager>[0]> = {}) {
  const props = {
    mine,
    theirs,
    onInvite: vi.fn(async () => ({ ok: true as const, email: "ny@eksempel.no" })),
    onAccept: vi.fn(async () => ({ ok: true as const })),
    onStop: vi.fn(async () => ({ ok: true as const })),
    ...overrides,
  };
  render(<ShareManager {...props} />);
  return props;
}

describe("ShareManager", () => {
  it("inviterer med e-post, tømmer feltet og melder fra", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.type(screen.getByLabelText("E-posten til den du vil dele med"), "ny@eksempel.no");
    await user.click(screen.getByRole("button", { name: "Inviter" }));
    expect(props.onInvite).toHaveBeenCalledWith("ny@eksempel.no");
    expect(
      await screen.findByText("Invitasjonen er sendt til ny@eksempel.no."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("E-posten til den du vil dele med")).toHaveValue("");
  });

  it("viser feilmeldingen fra handlingen som varsel", async () => {
    const user = userEvent.setup();
    setup({ onInvite: vi.fn(async () => ({ ok: false as const, message: "Fant ingen konto." })) });
    await user.click(screen.getByRole("button", { name: "Inviter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Fant ingen konto.");
    expect(screen.getByLabelText("E-posten til den du vil dele med")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("viser status for dem du deler med, og lar deg avslutte", async () => {
    const user = userEvent.setup();
    const props = setup();
    expect(screen.getByText("Venter på svar")).toBeInTheDocument();
    expect(screen.getAllByText("Deler").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Avslutt delingen med per@eksempel.no" }));
    expect(props.onStop).toHaveBeenCalledWith(1);
    expect(
      await screen.findByText("Delingen med per@eksempel.no er avsluttet."),
    ).toBeInTheDocument();
  });

  it("lar deg godta eller avslå en invitasjon, og åpne en godtatt samling", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(
      screen.getByRole("button", { name: "Godta invitasjonen fra ola@eksempel.no" }),
    );
    expect(props.onAccept).toHaveBeenCalledWith(3);
    expect(
      await screen.findByText("Du ser nå oppskriftene til ola@eksempel.no."),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Avslå invitasjonen fra ola@eksempel.no" }),
    );
    expect(props.onStop).toHaveBeenCalledWith(3);
    expect(await screen.findByText("Invitasjonen er avslått.")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Se oppskriftene til liv@eksempel.no" }),
    ).toHaveAttribute("href", "/delt/6");
  });

  it("tåler at handlingen kaster", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup({
      onInvite: vi.fn(async () => {
        throw new Error("nei");
      }),
    });
    await user.click(screen.getByRole("button", { name: "Inviter" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("uten delinger står det at listene er tomme", () => {
    setup({ mine: [], theirs: [] });
    expect(screen.getByText("Du deler ikke med noen ennå.")).toBeInTheDocument();
    expect(screen.getByText("Ingen deler samlingen sin med deg ennå.")).toBeInTheDocument();
  });
});
