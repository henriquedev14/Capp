import { describe, expect, it } from "vitest";
import { contarDiasUteis, diasUteisEntre } from "@/core/analytics/calendario-operacional";

describe("calendário operacional", () => {
  it("não conta sábado e domingo", () => {
    expect(diasUteisEntre(new Date("2026-08-14T12:00:00"), new Date("2026-08-17T12:00:00"))).toBe(1);
  });

  it("no mesmo dia o aging é zero", () => {
    const d = new Date("2026-08-14T08:00:00");
    expect(diasUteisEntre(d, new Date("2026-08-14T18:00:00"))).toBe(0);
  });

  it("conta apenas dias úteis de uma janela", () => {
    expect(contarDiasUteis(new Date("2026-08-10T00:00:00"), new Date("2026-08-16T23:59:59"))).toBe(5);
  });
});
