import { describe, it, expect, vi } from "vitest";
import { generateCertificateId } from "@/lib/cert";

vi.mock("@/lib/db", () => ({
  db: {
    certificate: {
      count: vi.fn().mockResolvedValue(41),
    },
  },
}));

describe("Certificate ID generation", () => {
  it("generates the correct format", async () => {
    const id = await generateCertificateId("cna");
    const year = new Date().getFullYear();
    expect(id).toBe(`MTC-${year}-CNA-00042`);
  });

  it("pads sequence number to 5 digits", async () => {
    const { db } = await import("@/lib/db");
    (db.certificate.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    const id = await generateCertificateId("cna");
    const year = new Date().getFullYear();
    expect(id).toBe(`MTC-${year}-CNA-00001`);
  });

  it("uses first 4 chars of course slug", async () => {
    const { db } = await import("@/lib/db");
    (db.certificate.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    const id = await generateCertificateId("basic-nursing-care");
    expect(id).toContain("BASI");
  });
});
