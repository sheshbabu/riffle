import { showToast } from '../components/Toast.jsx';

async function request(method, url, payload) {
  const options = {
    method: method,
    headers: {}
  };

  if (payload instanceof FormData) {
    options.body = payload;
  } else if (payload) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw response;
    }

    const isJsonResponse = response.headers.get('content-type')?.includes('application/json');
    return isJsonResponse ? await response.json() : null;
  } catch (error) {
    if (!navigator.onLine) {
      showToast("No internet connection");
      console.error("Network error:", error);
      throw error;
    }

    if (error instanceof TypeError && (
      error.message.includes('fetch') ||
      error.message.includes('Load failed') ||
      error.message.includes('NetworkError')
    )) {
      showToast("Connection failed");
      console.error("Fetch error:", error);
      throw error;
    }

    if (error instanceof Response) {
      const contentType = error.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await error.json();
        const err = new Error(error.statusText);
        err.code = body?.code;
        err.message = body?.message || 'An unexpected error occurred';
        showToast(err.message);
        console.error('API error:', body);
        throw err;
      }

      // Handle plain text errors from http.Error()
      const text = await error.text();
      const message = text || 'An unexpected error occurred';
      showToast(message);
      console.error('API error:', message);
      throw new Error(message);
    }

    throw error;
  }
}

async function scanImportFolder(payload) {
  return await request('POST', '/api/import/scan/', payload);
}

async function getScanResults() {
  return await request('GET', '/api/import/scan/results/');
}

async function getScanProgress() {
  return await request('GET', '/api/import/scan/progress/');
}

async function importToLibrary(payload) {
  return await request('POST', '/api/import/move/', payload);
}

async function getPhotos(offset, withSessions) {
  const sessionsParam = withSessions ? '&sessions=true' : '';
  return await request('GET', `/api/photos/?offset=${offset}${sessionsParam}`);
}

async function getUncuratedPhotos(offset, withSessions) {
  const sessionsParam = withSessions ? '&sessions=true' : '';
  return await request('GET', `/api/photos/uncurated/?offset=${offset}${sessionsParam}`);
}

async function getTrashedPhotos(offset, withSessions) {
  const sessionsParam = withSessions ? '&sessions=true' : '';
  return await request('GET', `/api/photos/trashed/?offset=${offset}${sessionsParam}`);
}

export default {
  request,
  scanImportFolder,
  getScanResults,
  getScanProgress,
  importToLibrary,
  getPhotos,
  getUncuratedPhotos,
  getTrashedPhotos
};
