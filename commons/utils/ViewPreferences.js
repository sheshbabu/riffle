const VIEW_PREFERENCE_PREFIX = 'riffle-view';
const DEFAULT_VIEW = 'grid';

function getPreference(page) {
  try {
    const key = `${VIEW_PREFERENCE_PREFIX}-${page}`;
    return localStorage.getItem(key) || DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

// view: "grid" || "sessions"
function setPreference(page, view) {
  try {
    const key = `${VIEW_PREFERENCE_PREFIX}-${page}`;
    localStorage.setItem(key, view);
  } catch {
  }
}

export default {
  getPreference,
  setPreference
};
