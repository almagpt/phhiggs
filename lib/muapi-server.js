/**
 * Server-side Muapi client — matches https://muapi.ai/docs/authentication
 * Base: https://api.muapi.ai — header: x-api-key
 */
export const MUAPI_BASE = 'https://api.muapi.ai';

/** @see https://api.muapi.ai/openapi.json — get_gallery_data media_type */
export const MUAPI_GALLERY_MEDIA_TYPES = ['all', 'image', 'video', 'audio'];

export async function muapiUpstreamJson(apiKey, path, { query, method = 'GET', body } = {}) {
    const params = new URLSearchParams();
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null && value !== '') {
                params.set(key, String(value));
            }
        }
    }
    const qs = params.toString();
    const url = `${MUAPI_BASE}${path}${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: body != null ? JSON.stringify(body) : undefined,
    });

    let data = {};
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    return { ok: response.ok, status: response.status, data };
}

/** GET /app/get_gallery_data — official gallery endpoint */
export function fetchMuapiGallery(apiKey, { mediaType = 'all', page = 1 } = {}) {
    const type = MUAPI_GALLERY_MEDIA_TYPES.includes(mediaType) ? mediaType : 'all';
    return muapiUpstreamJson(apiKey, '/app/get_gallery_data', {
        query: { media_type: type, page },
    });
}

/** GET /app/get_run_history_data — usage log (fallback for studio history) */
export function fetchMuapiRunHistory(apiKey, { page = 1 } = {}) {
    return muapiUpstreamJson(apiKey, '/app/get_run_history_data', {
        query: { page, include_count: 'false' },
    });
}

/** GET /api/v1/account/balance */
export function fetchMuapiBalance(apiKey) {
    return muapiUpstreamJson(apiKey, '/api/v1/account/balance');
}
