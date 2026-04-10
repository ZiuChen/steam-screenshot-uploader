import { createContext, useContext, useEffect, useReducer } from "react";
import { render } from "ink";
import { MemoryRouter, Routes, Route } from "react-router";
import { appReducer, initialState, AppStateContext, AppDispatchContext } from "@/tui/store.ts";
import { MainScreen } from "@/tui/routes/main.tsx";
import { UploadScreen } from "@/tui/routes/upload.tsx";
import { detectSteamDir } from "@/core/steam.ts";
import { discoverUsers } from "@/core/user.ts";
import { resolveGames } from "@/core/game.ts";

export interface LaunchOptions {
  customSteamDir?: string;
  initialRoute?: string;
  filePaths?: string[];
  userId?: string;
  gameId?: string;
}

const LaunchOptionsContext = createContext<LaunchOptions>({});

export function useLaunchOptions(): LaunchOptions {
  return useContext(LaunchOptionsContext);
}

function App({ options }: { options: LaunchOptions }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    void initializeApp();
  }, []);

  async function initializeApp() {
    dispatch({ type: "SET", key: "status", value: "Detecting Steam installation..." });

    const steam = detectSteamDir(options.customSteamDir);
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
      // Pre-select user: prefer options.userId, fallback to first user
      let selectedUser = users[0]!;
      if (options.userId) {
        const found = users.find((u) => u.userId === options.userId);
        if (found) selectedUser = found;
      }
      dispatch({ type: "SET", key: "selectedUser", value: selectedUser });

      dispatch({ type: "SET", key: "status", value: "Loading games..." });
      const games = await resolveGames(
        steam.steamDir,
        steam.userDataDir,
        selectedUser.userId,
        selectedUser.vdfPath,
      );
      dispatch({ type: "SET", key: "games", value: games });

      // Pre-select game: prefer options.gameId, fallback to first game
      if (options.gameId) {
        const found = games.find((g) => g.appId === options.gameId);
        dispatch({
          type: "SET",
          key: "selectedGame",
          value: found ?? {
            appId: options.gameId,
            name: `Game ${options.gameId}`,
            isShortcut: false,
          },
        });
      } else if (games.length > 0) {
        dispatch({ type: "SET", key: "selectedGame", value: games[0]! });
      }
    }

    dispatch({ type: "SET", key: "status", value: "Ready" });
  }

  return (
    <LaunchOptionsContext.Provider value={options}>
      <AppStateContext.Provider value={state}>
        <AppDispatchContext.Provider value={dispatch}>
          <MemoryRouter initialEntries={[options.initialRoute ?? "/"]}>
            <Routes>
              <Route path="/" element={<MainScreen />} />
              <Route path="/upload" element={<UploadScreen />} />
            </Routes>
          </MemoryRouter>
        </AppDispatchContext.Provider>
      </AppStateContext.Provider>
    </LaunchOptionsContext.Provider>
  );
}

export function launchTui(options: LaunchOptions = {}) {
  render(<App options={options} />, { exitOnCtrlC: false });
}
