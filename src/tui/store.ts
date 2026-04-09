import { createContext, useContext, type Dispatch } from "react";
import type { SteamUser, SteamGame, FileEntry } from "../core/types.ts";

export interface AppState {
  steamDir: string | null;
  steamValid: boolean;
  users: SteamUser[];
  selectedUser: SteamUser | null;
  games: SteamGame[];
  selectedGame: SteamGame | null;
  currentDir: string;
  files: FileEntry[];
  selectedFiles: FileEntry[];
  status: string;
  activePanel: "browser" | "selected";
  isUploading: boolean;
  showGamePicker: boolean;
  showUserPicker: boolean;
  uploadProgress: { current: number; total: number } | null;
  browserFocusIndex: number;
  selectedFocusIndex: number;
  gamePickerFocusIndex: number;
  userPickerFocusIndex: number;
  gameSearchTerm: string;
}

export const initialState: AppState = {
  steamDir: null,
  steamValid: false,
  users: [],
  selectedUser: null,
  games: [],
  selectedGame: null,
  currentDir: process.cwd(),
  files: [],
  selectedFiles: [],
  status: "Ready",
  activePanel: "browser",
  isUploading: false,
  showGamePicker: false,
  showUserPicker: false,
  uploadProgress: null,
  browserFocusIndex: 0,
  selectedFocusIndex: 0,
  gamePickerFocusIndex: 0,
  userPickerFocusIndex: 0,
  gameSearchTerm: "",
};

export type AppAction =
  | { type: "SET"; key: keyof AppState; value: unknown }
  | { type: "MERGE"; patch: Partial<AppState> }
  | { type: "UPDATE_FILES"; updater: (files: FileEntry[]) => FileEntry[] };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET":
      return { ...state, [action.key]: action.value };
    case "MERGE":
      return { ...state, ...action.patch };
    case "UPDATE_FILES":
      return { ...state, files: action.updater(state.files) };
  }
}

export const AppStateContext = createContext<AppState>(initialState);
export const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {});

export function useAppState(): AppState {
  return useContext(AppStateContext);
}

export function useAppDispatch(): Dispatch<AppAction> {
  return useContext(AppDispatchContext);
}
