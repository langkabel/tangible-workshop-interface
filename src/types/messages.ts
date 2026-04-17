// Internal message — controller -> display (we own the shape)
export type FeedbackKind = "lightbulb" | "heart" | "star" | "replay";

export interface FeedbackMessage {
  type: "feedback";
  payload: { kind: FeedbackKind };
  ts: number;
}

// External message — ESP32 -> display via Ably REST (untrusted)
export interface PresenterPayload {
  // define fields when ESP32 event schema is known
}

export interface ExternalMessage {
  type: string;
  payload: PresenterPayload;
  ts: number;
}

export type WorkshopMessage = FeedbackMessage | ExternalMessage;

export function isExternalMessage(data: unknown): data is ExternalMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as Record<string, unknown>).type === "string" &&
    "ts" in data &&
    typeof (data as Record<string, unknown>).ts === "number"
  );
}
