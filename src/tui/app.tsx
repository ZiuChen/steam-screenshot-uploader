import { useEffect, useReducer } from "react";
import { render, useInput } from "ink";
import { appReducer, initialState, AppStateContext, AppDispatchContext } from "./store.ts";
import { Header } from "./components/header.tsx";
import { Footer } from "./components/footer.tsx";
import { FileBrowser } from "./components/file-browser.tsx";
import { SelectedList } from "./components/selected-list.tsx";
import { GamePicker } from "./components/game-picker.tsx";
import { UserPicker } from "./components/user-picker.tsx";
import { detectSteamDir } from "../core/steam.ts";
import { discoverUsers } from "../core/user.ts";
import { resolveGames } from "../core/game.ts";
import { handleGamePickerKeys } from "./keys/game-picker.ts";
import { handleUserPickerKeys } from "./keys/user-picker.ts";
import { handleBrowserKeys, handleSelectedKeys } from "./keys/browser.ts";
import { handleGlobalKeys } from "./keys/global.ts";
import type { KeyHandler } from "./keys/types.ts";

const keyHandlers: KeyHandler[] = [
  handleGamePickerKeys,
  handleUserPickerKeys,
  handleBrowserKeys,
  handleSelectedKeys,
  handleGlobalKeys,
];

function App({ customSteamDir }: { customSteamDir?: string }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    void initializeApp(customSteamDir);
  }, []);

  async function initializeApp(customDir?: string) {
    dispatch({ type: "SET", key: "status", value: "Detecting Steam installation..." });

    const steam = detectSteamDir(customDir);
    dispatch({ type: "MERGE", patch: { steamDir: steam.steamDir, steamValid: steam.isValid } });

    if (!steam.isValid) {
      dispatch({
        type: "SET",
        key: "status",
        value: "⚠️  Steam directory not found. Use --steam-dir to specify.",
      });
      return;
    }

    dispatch({ type: "SET", key: "status", value: "Discovering users..." });
    const users = await discoverUsers(steam.userDataDir);
    dispatch({ type: "SET", key: "users", value: users });

    if (users.length > 0) {
      dispatch({ type: "SET", key: "selectedUser", value: users[0]! });

      dispatch({ type: "SET", key: "status", value: "Loading games..." });
      const games = await resolveGames(steam.userDataDir, users[0]!.userId, users[0]!.vdfPath);
      dispatch({ type: "SET", key: "games", value: games });
      if (games.length > 0) {
        dispatch({ type: "SET", key: "selectedGame", value: games[0]! });
      }
    }

    dispatch({ type: "SET", key: "status", value: "Ready" });
  }

  useInput((input, key) => {
    for (const handler of keyHandlers) {
      if (handler({ input, key }, state, dispatch)) return;
    }
  });

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <Header />
        <FileBrowser />
        <SelectedList />
        <Footer />
        <GamePicker />
        <UserPicker />
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function launchTui(customSteamDir?: string) {
  render(<App customSteamDir={customSteamDir} />);
}
