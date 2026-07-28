import { describe, expect, it } from "vitest";
import {
  AUTO_SEND_CONFIDENCE,
  isAutoSendable,
  routeReply,
} from "@/lib/ai/concierge";
import {
  ConciergeCategorySchema,
  ConciergeReplySchema,
  type ConciergeCategory,
  type ConciergeReply,
} from "@/lib/ai/schemas";

const reply = (over: Partial<ConciergeReply> = {}): ConciergeReply => ({
  category: "PACKING_AND_KIT",
  confidence: 0.95,
  reply: "Bring soft bags rather than hard suitcases — there is nowhere to stow a shell.",
  needsHuman: false,
  reason: "Routine packing question fully covered by the readiness programme.",
  ...over,
});

/** Every category the model can emit, so the policy test can't silently miss one. */
const ALL_CATEGORIES = ConciergeCategorySchema.options as ConciergeCategory[];

const ESCALATE_ALWAYS: ConciergeCategory[] = [
  "PRICE_OR_PAYMENT",
  "CANCELLATION_OR_REFUND",
  "SAFETY_OR_MEDICAL",
  "COMPLAINT",
  "BOOKING_CHANGE",
  "OTHER",
];

describe("concierge auto-send policy", () => {
  it("auto-sends confident informational answers", () => {
    const decision = routeReply(reply());
    expect(decision.action).toBe("AUTO_SEND");
  });

  it.each(ESCALATE_ALWAYS)(
    "never auto-sends %s, even at maximum confidence",
    (category) => {
      const decision = routeReply(
        reply({ category, confidence: 1, needsHuman: false }),
      );
      expect(decision.action).toBe("ESCALATE");
    },
  );

  it("escalates when the model asks for a human, whatever the category", () => {
    const decision = routeReply(
      reply({ needsHuman: true, confidence: 0.99, reason: "Traveller sounds upset." }),
    );
    expect(decision.action).toBe("ESCALATE");
    if (decision.action === "ESCALATE") {
      expect(decision.escalationReason).toContain("upset");
    }
  });

  it("escalates below the confidence threshold", () => {
    const decision = routeReply(
      reply({ confidence: AUTO_SEND_CONFIDENCE - 0.01 }),
    );
    expect(decision.action).toBe("ESCALATE");
  });

  it("auto-sends exactly at the threshold", () => {
    expect(routeReply(reply({ confidence: AUTO_SEND_CONFIDENCE })).action).toBe(
      "AUTO_SEND",
    );
  });

  it("classifies every category as either auto-sendable or escalating", () => {
    // Guards against a category being added to the schema without a policy.
    for (const category of ALL_CATEGORIES) {
      const decision = routeReply(reply({ category }));
      expect(["AUTO_SEND", "ESCALATE"]).toContain(decision.action);
      expect(isAutoSendable(category)).toBe(decision.action === "AUTO_SEND");
    }
  });

  it("keeps money, safety and contract categories out of the auto-send set", () => {
    for (const category of ESCALATE_ALWAYS) {
      expect(isAutoSendable(category)).toBe(false);
    }
  });

  it("always carries the draft through so a human never starts from blank", () => {
    const decision = routeReply(
      reply({ category: "CANCELLATION_OR_REFUND", confidence: 0.4 }),
    );
    expect(decision.reply.reply.length).toBeGreaterThan(0);
  });
});

describe("concierge reply schema", () => {
  it("rejects a confidence outside 0..1", () => {
    expect(ConciergeReplySchema.safeParse({ ...reply(), confidence: 1.4 }).success).toBe(
      false,
    );
  });

  it("rejects an unknown category rather than letting it through as a string", () => {
    const parsed = ConciergeReplySchema.safeParse({
      ...reply(),
      category: "REFUND_PLEASE",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty reply body", () => {
    expect(ConciergeReplySchema.safeParse({ ...reply(), reply: "" }).success).toBe(
      false,
    );
  });
});
