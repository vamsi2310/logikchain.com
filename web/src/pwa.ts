import { registerSW } from "virtual:pwa-register";

export type PwaUpdate = {
  needRefresh: boolean;
  offlineReady: boolean;
  update: () => void;
};

type Listener = (s: PwaUpdate) => void;

const listeners = new Set<Listener>();
let state: PwaUpdate = {
  needRefresh: false,
  offlineReady: false,
  update: () => undefined,
};

function emit() {
  for (const l of listeners) l(state);
}

let updateSW: (reload?: boolean) => Promise<void> = async () => undefined;
try {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      state = { ...state, needRefresh: true, update: () => void updateSW(true) };
      emit();
    },
    onOfflineReady() {
      state = { ...state, offlineReady: true };
      emit();
    },
  });
} catch {
  /* virtual:pwa-register is a no-op until a production build */
}

state = { ...state, update: () => void updateSW(true) };

export function subscribePwa(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getPwaState(): PwaUpdate {
  return state;
}
