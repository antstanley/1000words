/**
 * Draft auto-save store using localStorage.
 * Automatically persists story drafts while editing.
 */

import { writable, get } from "svelte/store";
import { browser } from "$app/environment";

const DRAFT_KEY = "1000words-draft";
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds

export interface Draft {
  title: string;
  content: string;
  savedAt: number;
}

function createDraftStore() {
  const { subscribe, set } = writable<Draft | null>(null);

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingChanges = false;

  // Load draft from localStorage on init
  function load(): Draft | null {
    if (!browser) return null;

    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as Draft;
        set(draft);
        return draft;
      }
    } catch {
      console.warn("Failed to load draft from localStorage");
    }
    return null;
  }

  // Save draft to localStorage
  function save(title: string, content: string): void {
    if (!browser) return;

    const draft: Draft = {
      title,
      content,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      set(draft);
      pendingChanges = false;
    } catch {
      console.warn("Failed to save draft to localStorage");
    }
  }

  // Clear draft from localStorage
  function clear(): void {
    if (!browser) return;

    try {
      localStorage.removeItem(DRAFT_KEY);
      set(null);
    } catch {
      console.warn("Failed to clear draft from localStorage");
    }
  }

  // Mark changes as pending (triggers auto-save)
  function markDirty(title: string, content: string): void {
    pendingChanges = true;

    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new auto-save timer
    autoSaveTimer = setTimeout(() => {
      if (pendingChanges) {
        save(title, content);
      }
    }, AUTO_SAVE_INTERVAL);
  }

  // Force immediate save
  function saveNow(title: string, content: string): void {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    save(title, content);
  }

  // Check if there's a saved draft
  function hasDraft(): boolean {
    return get({ subscribe }) !== null;
  }

  // Get time since last save
  function getTimeSinceSave(): number | null {
    const draft = get({ subscribe });
    if (!draft) return null;
    return Date.now() - draft.savedAt;
  }

  return {
    subscribe,
    load,
    save,
    saveNow,
    clear,
    markDirty,
    hasDraft,
    getTimeSinceSave,
  };
}

export const drafts = createDraftStore();
