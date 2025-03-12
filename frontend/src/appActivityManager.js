import Dexie from 'dexie';

const APP_KEY = "ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==_APP";
const SESSION_KEY_PREFIX = "ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==_SESSION_";
const HEARTBEAT_INTERVAL = 60000; // 1 minute
const STALE_THRESHOLD = 600000; // 10 minutes

async function clearResearchPaLData() {
  const db = new Dexie('ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==');
  db.version(1).stores({ Sessions: 'id' });
  try {
    await db.table('Sessions').clear();
    console.log("Cleared ResearchPaL data from IndexedDB.");
  } catch (error) {
    console.error("Error clearing ResearchPaL data:", error);
  }
}

function cleanupAppKey() {
    const now = Date.now();
    const timestamp = parseInt(localStorage.getItem(APP_KEY) || "0", 10);
    if (!timestamp || (now - timestamp > STALE_THRESHOLD)) {
      localStorage.removeItem(APP_KEY);
      return true;
    }
    return false;
}

function cleanupStaleSessionKeys() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(SESSION_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

export async function appActivityManager() {
    const res = cleanupAppKey();

    if (res) {
      cleanupStaleSessionKeys();
      console.log("Cleaned stale session keys from local storage.");

      await clearResearchPaLData();
    }

    setInterval(() => {
      localStorage.setItem(APP_KEY, Date.now().toString());
    }, HEARTBEAT_INTERVAL);
}