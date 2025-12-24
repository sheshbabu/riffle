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
      console.error("Network error:", error);
      throw error;
    }

    if (error instanceof TypeError && (
      error.message.includes('fetch') ||
      error.message.includes('Load failed') ||
      error.message.includes('NetworkError')
    )) {
      console.error("Fetch error:", error);
      throw error;
    }

    if (error instanceof Response) {
      const isJsonResponse = error.headers.get('content-type')?.includes('application/json');

      if (isJsonResponse) {
        const body = await error.json();
        const err = new Error(error.statusText);
        err.code = body?.code;
        err.message = body?.message || 'An unexpected error occurred';
        console.error('API error:', body);
        throw err;
      }

      throw new Error(error.statusText);
    }

    throw error;
  }
}

async function analyzeImport(payload) {
  return await request('POST', '/api/import/analyze/', payload);
}

async function getImportAnalysis() {
  return await request('GET', '/api/import/analysis/');
}

async function importToLibrary(payload) {
  return await request('POST', '/api/import/import/', payload);
}

export default {
  request,
  analyzeImport,
  getImportAnalysis,
  importToLibrary
};
