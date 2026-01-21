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

function buildFilterParams(filters) {
  if (!filters) {
    return ''
  };

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

async function getPhotos(offset, filters) {
  const filterParams = buildFilterParams(filters);
  return await request('GET', `/api/photos/?offset=${offset}${filterParams}`);
}

async function getUncuratedPhotos(offset, filters) {
  const filterParams = buildFilterParams(filters);
  return await request('GET', `/api/photos/uncurated/?offset=${offset}${filterParams}`);
}

async function getTrashedPhotos(offset, filters) {
  const filterParams = buildFilterParams(filters);
  return await request('GET', `/api/photos/trashed/?offset=${offset}${filterParams}`);
}

async function getFilterOptions() {
  return await request('GET', '/api/photos/filters/');
}

async function getCalendarMonths() {
  return await request('GET', '/api/calendar/months/');
}

async function getSettings() {
  return await request('GET', '/api/settings/');
}

async function updateSetting(key, value) {
  return await request('POST', '/api/settings/', { key, value });
}

async function rebuildThumbnails() {
  return await request('POST', '/api/thumbnails/rebuild/', {});
}

async function getThumbnailRebuildProgress() {
  return await request('GET', '/api/thumbnails/rebuild/progress/');
}

async function curatePhoto(filePath, action, rating) {
  return await request('POST', '/api/photos/curate/', { filePath, action, rating });
}

async function getAlbums() {
  return await request('GET', '/api/albums/');
}

async function getAlbum(albumId) {
  return await request('GET', `/api/albums/${albumId}/`);
}

async function createAlbum(name, description) {
  return await request('POST', '/api/albums/', { name, description });
}

async function addPhotosToAlbums(albumIds, filePaths) {
  return await request('PUT', '/api/albums/photos/', { albumIds, filePaths });
}

async function removePhotosFromAlbum(albumId, filePaths) {
  return await request('DELETE', `/api/albums/${albumId}/photos/`, { filePaths });
}

async function deleteAlbum(albumId) {
  return await request('DELETE', `/api/albums/${albumId}/`);
}

async function getAlbumPhotos(albumId) {
  return await request('GET', `/api/albums/${albumId}/photos/`);
}

async function getPhotoAlbums(filePath) {
  return await request('GET', `/api/photo/albums/?path=${encodeURIComponent(filePath)}`);
}

async function startImportSession(payload) {
  return await request('POST', '/api/import/sessions/', payload);
}

async function getImportProgress() {
  return await request('GET', '/api/import/sessions/progress/');
}

async function getImportSessions() {
  return await request('GET', '/api/import/sessions/');
}

async function startExportSession(minRating, curationStatus) {
  return await request('POST', '/api/export/sessions/', { minRating, curationStatus });
}

async function getExportProgress() {
  return await request('GET', '/api/export/sessions/progress/');
}

async function getExportSessions() {
  return await request('GET', '/api/export/sessions/');
}

export default {
  request,
  getPhotos,
  getUncuratedPhotos,
  getTrashedPhotos,
  getFilterOptions,
  getCalendarMonths,
  getSettings,
  updateSetting,
  rebuildThumbnails,
  getThumbnailRebuildProgress,
  curatePhoto,
  getAlbums,
  getAlbum,
  createAlbum,
  addPhotosToAlbums,
  removePhotosFromAlbum,
  deleteAlbum,
  getAlbumPhotos,
  getPhotoAlbums,
  startImportSession,
  getImportProgress,
  getImportSessions,
  startExportSession,
  getExportProgress,
  getExportSessions
};
