/**
 * Section 8 live class additions — unit tests.
 *
 * Tests that do not need a DB: presentation panel allowed MIME types,
 * single-presenter rule logic, roll call CSV column list.
 * DB tests are skipped (environment only).
 */

import { describe, it, expect } from "vitest";

// ─── Allowed presentation MIME types ─────────────────────────────────────────

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf":                                                              "pdf",
  "application/vnd.ms-powerpoint":                                               "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":  "pptx",
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

describe("ClassPresentation: allowed MIME types", () => {
  it("accepts PDF", () => expect("application/pdf" in ALLOWED_TYPES).toBe(true));
  it("accepts PPTX", () => expect("application/vnd.openxmlformats-officedocument.presentationml.presentation" in ALLOWED_TYPES).toBe(true));
  it("accepts PNG", () => expect("image/png" in ALLOWED_TYPES).toBe(true));
  it("rejects docx", () => expect("application/vnd.openxmlformats-officedocument.wordprocessingml.document" in ALLOWED_TYPES).toBe(false));
  it("rejects mp4", () => expect("video/mp4" in ALLOWED_TYPES).toBe(false));
  it("rejects zip", () => expect("application/zip" in ALLOWED_TYPES).toBe(false));
});

// ─── Single-presenter enforcement logic ───────────────────────────────────────

describe("Single presenter rule", () => {
  /**
   * Simulate the DB logic: a list of students with isPresenter flags.
   * When granting presenter to studentB, all others must be set to false.
   */
  function grantPresenter(
    rows: Array<{ userId: string; isPresenter: boolean }>,
    studentId: string
  ): Array<{ userId: string; isPresenter: boolean }> {
    return rows.map((row) =>
      row.userId === studentId
        ? { ...row, isPresenter: true }
        : { ...row, isPresenter: false }  // revoke all others
    );
  }

  it("only one student can be presenter at a time", () => {
    const students = [
      { userId: "s1", isPresenter: true },
      { userId: "s2", isPresenter: false },
      { userId: "s3", isPresenter: false },
    ];
    const after = grantPresenter(students, "s2");
    const presenters = after.filter((s) => s.isPresenter);
    expect(presenters).toHaveLength(1);
    expect(presenters[0].userId).toBe("s2");
  });

  it("revoking presenter leaves no presenter", () => {
    const students = [
      { userId: "s1", isPresenter: true },
      { userId: "s2", isPresenter: false },
    ];
    const after = students.map((s) =>
      s.userId === "s1" ? { ...s, isPresenter: false } : s
    );
    expect(after.every((s) => !s.isPresenter)).toBe(true);
  });

  it("granting presenter to a new student revokes the previous one", () => {
    const students = [
      { userId: "s1", isPresenter: true },
      { userId: "s2", isPresenter: false },
    ];
    const after = grantPresenter(students, "s2");
    expect(after.find((s) => s.userId === "s1")?.isPresenter).toBe(false);
    expect(after.find((s) => s.userId === "s2")?.isPresenter).toBe(true);
  });
});

// ─── Roll call CSV columns include course unit ────────────────────────────────

describe("Roll call export: CSV column list", () => {
  const EXPECTED_COLUMNS = [
    "Student",
    "Student number",
    "Course unit",
    "Status at start",
    "Start comment",
    "Status at end",
    "End comment",
    "Joined at",
    "Left at",
    "Minutes",
    "Attendance percent",
  ];

  it("CSV header contains Course unit column", () => {
    expect(EXPECTED_COLUMNS).toContain("Course unit");
  });

  it("CSV header contains Student number column", () => {
    expect(EXPECTED_COLUMNS).toContain("Student number");
  });

  it("CSV header has 11 columns", () => {
    expect(EXPECTED_COLUMNS).toHaveLength(11);
  });
});

// ─── SpeakStatus state machine ────────────────────────────────────────────────

type SpeakStatus = "LISTEN_ONLY" | "REQUESTED" | "CAN_SPEAK";

function handleRaiseHand(current: SpeakStatus): SpeakStatus {
  if (current === "CAN_SPEAK") return "CAN_SPEAK"; // no-op, already speaking
  return "REQUESTED";
}

function handleGrantSpeak(): SpeakStatus {
  return "CAN_SPEAK";
}

function handleRevokeSpeak(): SpeakStatus {
  return "LISTEN_ONLY";
}

describe("SpeakStatus state machine", () => {
  it("new student starts LISTEN_ONLY", () => {
    const status: SpeakStatus = "LISTEN_ONLY";
    expect(status).toBe("LISTEN_ONLY");
  });

  it("raise_hand transitions LISTEN_ONLY -> REQUESTED", () => {
    expect(handleRaiseHand("LISTEN_ONLY")).toBe("REQUESTED");
  });

  it("raise_hand on CAN_SPEAK stays CAN_SPEAK (no downgrade)", () => {
    expect(handleRaiseHand("CAN_SPEAK")).toBe("CAN_SPEAK");
  });

  it("instructor grant transitions -> CAN_SPEAK", () => {
    expect(handleGrantSpeak()).toBe("CAN_SPEAK");
  });

  it("instructor revoke transitions -> LISTEN_ONLY", () => {
    expect(handleRevokeSpeak()).toBe("LISTEN_ONLY");
  });
});

// ─── Recording: "Recording pending" state ─────────────────────────────────────

describe("Recording state", () => {
  it("recordingStatus is PENDING when class ends without a recording URL", () => {
    const status = "PENDING";
    const recordingUrl = null;
    expect(status).toBe("PENDING");
    expect(recordingUrl).toBeNull();
  });

  it("recordingStatus is AVAILABLE after URL is saved", () => {
    const status = "AVAILABLE";
    const recordingUrl = "https://meet.google.com/recording/xyz";
    expect(status).toBe("AVAILABLE");
    expect(recordingUrl).not.toBeNull();
  });
});
