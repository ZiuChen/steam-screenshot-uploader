import type { Key } from "ink";

export interface KeyInput {
  input: string;
  key: Key;
}

export type AppState = import("../store.ts").AppState;
export type AppAction = import("../store.ts").AppAction;

/** A key handler returns true if it consumed the event. */
export type KeyHandler = (
  ki: KeyInput,
  state: AppState,
  dispatch: (action: AppAction) => void,
) => boolean;
