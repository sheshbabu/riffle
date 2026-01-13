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

async function getImportProgress() {
  return await request('GET', '/api/import/progress/');
}

async function importToLibrary(copyMode = false) {
  return await request('POST', '/api/import/move/', { copyMode });
}

function buildFilterParams(filters) {
  if (!filters) return '';

  const params = [];

  if (filters.ratings && filters.ratings.length > 0) {
    filters.ratings.forEach(r => params.push(`ratings=${r}`));
  }
  if (filters.mediaType && filters.mediaType !== 'all') {
    params.push(`mediaType=${filters.mediaType}`);
  }
  if (filters.orientation && filters.orientation !== 'all') {
    params.push(`orientation=${filters.orientation}`);
  }
  if (filters.years && filters.years.length > 0) {
    filters.years.forEach(y => params.push(`years=${y}`));
  }
  if (filters.cameraMakes && filters.cameraMakes.length > 0) {
    filters.cameraMakes.forEach(m => params.push(`cameraMakes=${encodeURIComponent(m)}`));
  }
  if (filters.cameraModels && filters.cameraModels.length > 0) {
    filters.cameraModels.forEach(m => params.push(`cameraModels=${encodeURIComponent(m)}`));
  }
  if (filters.countries && filters.countries.length > 0) {
    filters.countries.forEach(c => params.push(`countries=${encodeURIComponent(c)}`));
  }
  if (filters.states && filters.states.length > 0) {
    filters.states.forEach(s => params.push(`states=${encodeURIComponent(s)}`));
  }
  if (filters.cities && filters.cities.length > 0) {
    filters.cities.forEach(c => params.push(`cities=${encodeURIComponent(c)}`));
  }
  if (filters.fileFormats && filters.fileFormats.length > 0) {
    filters.fileFormats.forEach(f => params.push(`fileFormats=${encodeURIComponent(f)}`));
  }

  return params.length > 0 ? '&' + params.join('&') : '';
}

async function getPhotos(offset, withGroups, filters) {
  const groupsParam = withGroups ? '&groups=true' : '';
  const filterParams = buildFilterParams(filters);
  return await request('GET', `/api/photos/?offset=${offset}${groupsParam}${filterParams}`);
}

async function getUncuratedPhotos(offset, withGroups, filters) {
  const groupsParam = withGroups ? '&groups=true' : '';
  const filterParams = buildFilterParams(filters);
  return await request('GET', `/api/photos/uncurated/?offset=${offset}${groupsParam}${filterParams}`);
}

async function getTrashedPhotos(offset, withGroups, filters) {
  const groupsParam = withGroups ? '&groups=true' : '';
  const filterParams = buildFilterParams(filters);
  return await request('GET', `/api/photos/trashed/?offset=${offset}${groupsParam}${filterParams}`);
}

async function getFilterOptions() {
  return await request('GET', '/api/photos/filters/');
}

export default {
  request,
  scanImportFolder,
  getScanResults,
  getImportProgress,
  importToLibrary,
  getPhotos,
  getUncuratedPhotos,
  getTrashedPhotos,
  getFilterOptions
};
