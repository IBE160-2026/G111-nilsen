import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const purgeMock = vi.hoisted(() => vi.fn());

vi.mock("./server/services/recipe-service", () => ({ purgeStaleUnsavedRecipes: purgeMock }));

const { PURGE_INTERVAL_MS, register, schedulePurge } = await import("./instrumentation");

const globalForPurge = globalThis as typeof globalThis & { __recipematePurgeTimer?: unknown };

function resetTimer() {
  if (globalForPurge.__recipematePurgeTimer) {
    clearInterval(globalForPurge.__recipematePurgeTimer as ReturnType<typeof setInterval>);
  }
  delete globalForPurge.__recipematePurgeTimer;
}

beforeEach(() => {
  vi.useFakeTimers();
  resetTimer();
  purgeMock.mockReset();
  purgeMock.mockReturnValue({ ok: true, value: { deleted: 0 } });
});

afterEach(() => {
  resetTimer();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("schedulePurge", () => {
  it("rydder ved oppstart og deretter hver time", () => {
    const purge = vi.fn();
    schedulePurge(purge);
    expect(purge).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PURGE_INTERVAL_MS - 1);
    expect(purge).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(purge).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(2 * PURGE_INTERVAL_MS);
    expect(purge).toHaveBeenCalledTimes(4);
  });

  it("registreres ikke to ganger (hot reload)", () => {
    const first = vi.fn();
    const second = vi.fn();
    schedulePurge(first);
    schedulePurge(second);

    expect(second).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(PURGE_INTERVAL_MS);
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).not.toHaveBeenCalled();
  });

  it("holder ikke prosessen i live (unref)", () => {
    const unref = vi.fn();
    const realSetInterval = globalThis.setInterval;
    vi.spyOn(globalThis, "setInterval").mockImplementation(((
      ...args: Parameters<typeof setInterval>
    ) => {
      const timer = realSetInterval(...args);
      timer.unref = unref as typeof timer.unref;
      return timer;
    }) as typeof setInterval);

    schedulePurge(vi.fn());
    expect(unref).toHaveBeenCalledTimes(1);
  });

  it("logger en feil og fortsetter å rydde", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const purge = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("database låst");
      })
      .mockReturnValue({ ok: true, value: { deleted: 0 } });

    expect(() => schedulePurge(purge)).not.toThrow();
    expect(error).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PURGE_INTERVAL_MS);
    expect(purge).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("logger et feilsvar fra tjenesten", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    schedulePurge(() => ({ ok: false, error: { kind: "not_found" } }));
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe("register", () => {
  it.each(["edge", undefined])("gjør ingenting i kjøretiden %s", async (runtime) => {
    if (runtime) vi.stubEnv("NEXT_RUNTIME", runtime);
    else vi.stubEnv("NEXT_RUNTIME", "");
    await register();
    expect(purgeMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rydder ved oppstart og hver time i Node.js-kjøretiden", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    await register();
    expect(purgeMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PURGE_INTERVAL_MS);
    expect(purgeMock).toHaveBeenCalledTimes(2);
  });
});
