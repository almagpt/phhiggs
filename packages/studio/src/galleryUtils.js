/** Muapi gallery / usage log → studio history card (OpenAPI GalleryItemResponse). */

const IN_PROGRESS_STATUSES = new Set([
    'processing',
    'pending',
    'queued',
    'running',
    'in_progress',
    'submitted',
]);

const FAILED_STATUSES = new Set([
    'failed',
    'error',
    'cancelled',
    'canceled',
]);

const VIDEO_MODEL_HINT = /video|sora|kling|veo|seedance|wan|runway|luma|hailuo|pixverse|ovi|mochi/i;
const IMAGE_MODEL_HINT = /image|flux|midjourney|dall|gpt-image|recraft|ideogram|nano|banana|seedream/i;

function parseMaybeJson(value) {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    try {
        return JSON.parse(trimmed);
    } catch {
        return null;
    }
}

function looksLikeMediaUrl(value) {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    return (
        v.startsWith('http://') ||
        v.startsWith('https://') ||
        v.startsWith('//') ||
        /\.(mp4|webm|mov|m4v|png|jpe?g|webp|gif|wav|mp3)(\?|$)/i.test(v)
    );
}

function normalizeUrl(value) {
    if (!looksLikeMediaUrl(value)) return null;
    const v = value.trim();
    return v.startsWith('//') ? `https:${v}` : v;
}

/**
 * Extract media URL from Muapi output_data, prediction poll payloads, etc.
 * @see GET /api/v1/predictions/{id}/result — outputs[]
 */
export function extractMediaUrl(data, depth = 0) {
    if (data == null || depth > 10) return null;

    if (typeof data === 'string') {
        return normalizeUrl(data) || (parseMaybeJson(data) ? extractMediaUrl(parseMaybeJson(data), depth + 1) : null);
    }

    if (Array.isArray(data)) {
        for (const item of data) {
            const found = extractMediaUrl(item, depth + 1);
            if (found) return found;
        }
        return null;
    }

    if (typeof data !== 'object') return null;

    const directKeys = [
        'url',
        'video_url',
        'image_url',
        'output_url',
        'media_url',
        'file_url',
        'src',
        'href',
        'download_url',
        'result_url',
    ];
    for (const key of directKeys) {
        const found = normalizeUrl(data[key]);
        if (found) return found;
    }

    if (Array.isArray(data.urls)) {
        for (const u of data.urls) {
            const found = extractMediaUrl(u, depth + 1);
            if (found) return found;
        }
    }

    const nestedKeys = ['outputs', 'output', 'output_data', 'result', 'data', 'response', 'media', 'value'];
    for (const key of nestedKeys) {
        if (data[key] !== undefined) {
            const found = extractMediaUrl(data[key], depth + 1);
            if (found) return found;
        }
    }

    for (const value of Object.values(data)) {
        const found = extractMediaUrl(value, depth + 1);
        if (found) return found;
    }

    return null;
}

function normalizeOutputData(item) {
    let output = item?.output_data ?? item?.output ?? null;
    output = parseMaybeJson(output) ?? output;
    if (output && typeof output === 'object') return output;
    return {};
}

function normalizeInputData(item) {
    let input = item?.input_data ?? item?.input ?? null;
    input = parseMaybeJson(input) ?? input;
    if (input && typeof input === 'object') return input;
    return {};
}

function inferPrompt(output, input, item) {
    return (
        output.prompt ||
        input.prompt ||
        output.input?.prompt ||
        item?.prompt ||
        ''
    );
}

function isVideoMedia(item, url, filterType) {
    if (filterType && filterType !== 'video') return false;
    if (item?.media_type === 'video') return true;
    if (url && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return true;
    const model = item?.model_name || item?.model || '';
    return VIDEO_MODEL_HINT.test(model) || filterType !== 'image';
}

function isImageMedia(item, url, filterType) {
    if (filterType && filterType !== 'image') return false;
    if (item?.media_type === 'image') return true;
    if (url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) return true;
    const model = item?.model_name || item?.model || '';
    return IMAGE_MODEL_HINT.test(model) || filterType !== 'video';
}

function shouldSkipGalleryRow(item) {
    const status = (item?.status || '').toLowerCase();
    if (!status) return false;
    if (FAILED_STATUSES.has(status)) return true;
    if (IN_PROGRESS_STATUSES.has(status)) return true;
    return false;
}

/** Map GET /app/get_gallery_data result row → studio history entry. */
export function galleryItemToHistoryEntry(item, filterType) {
    if (!item || shouldSkipGalleryRow(item)) return null;

    const output = normalizeOutputData(item);
    const input = normalizeInputData(item);
    const url = extractMediaUrl(output) || extractMediaUrl(item);
    if (!url) return null;

    if (filterType === 'video' && !isVideoMedia(item, url, filterType)) return null;
    if (filterType === 'image' && !isImageMedia(item, url, filterType)) return null;

    return {
        id: item.id || item.request_id || url,
        url,
        prompt: inferPrompt(output, input, item),
        model: item.model_name || item.model || output.model || '',
        timestamp: item.created_at || item.timestamp || new Date().toISOString(),
    };
}

/** Merge histories; remote first; dedupe by id/url; newest first. */
export function mergeHistoryEntries(...lists) {
    const byKey = new Map();
    for (const list of lists) {
        for (const entry of list || []) {
            if (!entry?.url) continue;
            byKey.set(String(entry.id || entry.url), entry);
        }
    }
    return [...byKey.values()].sort(
        (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
    );
}
