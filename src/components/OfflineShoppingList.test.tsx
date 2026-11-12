// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  OFFLINE_LIST_KEY,
  parseOfflineList,
  writeOfflineList,
  type OfflineList,
} from "@/lib/offline-list";
import OfflineShoppingList from "./OfflineShoppingList";

const list: OfflineList = {
  version: 1,
  title: "Uke 46",
  savedAt: "2026-11-12T10:00:00.000Z",
  items: [
    { key: "melk|dl", text: "6 dl melk", from: "Pannekaker, Vafler" },
    { key: "egg|", text: "3 egg", from: "Pannekaker" },
  ],
  checked: [],
};

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("OfflineShoppingList", () => {
  it("uten lagret liste står det hvordan man får den", () => {
    render(<OfflineShoppingList />);
    expect(screen.getByText(/Åpne handlelisten mens du har nett/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("viser varene med oppskriftene de er til, og hvor mange som er igjen", () => {
    writeOfflineList(list);
    render(<OfflineShoppingList />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Handlelisten din · Uke 46" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /6 dl melk/ })).not.toBeChecked();
    expect(screen.getByText("Til Pannekaker, Vafler")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 av 2 igjen");
  });

  it("avkrysning huskes i nettleseren og teller ned", () => {
    writeOfflineList(list);
    render(<OfflineShoppingList />);
    fireEvent.click(screen.getByRole("checkbox", { name: /3 egg/ }));
    expect(screen.getByRole("checkbox", { name: /3 egg/ })).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("1 av 2 igjen");
    expect(parseOfflineList(window.localStorage.getItem(OFFLINE_LIST_KEY))?.checked).toEqual([
      "egg|",
    ]);
    fireEvent.click(screen.getByRole("checkbox", { name: /3 egg/ }));
    expect(screen.getByRole("checkbox", { name: /3 egg/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /3 egg/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /6 dl melk/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Du har alt.");
  });

  it("følger med når listen slettes eller endres et annet sted", () => {
    writeOfflineList(list);
    render(<OfflineShoppingList />);
    act(() => {
      window.localStorage.removeItem(OFFLINE_LIST_KEY);
      window.dispatchEvent(new Event("storage"));
    });
    expect(screen.getByText(/Åpne handlelisten mens du har nett/)).toBeInTheDocument();
  });

  it("ignorerer ødelagt innhold i lageret", () => {
    window.localStorage.setItem(OFFLINE_LIST_KEY, "{ødelagt");
    render(<OfflineShoppingList />);
    expect(screen.getByText(/Åpne handlelisten mens du har nett/)).toBeInTheDocument();
  });
});
