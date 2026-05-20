const COMPLETED_STATUSES = new Set([
    'completed',
    'succeeded',
    'success',
    'complete',
    'done',
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
        /\.(mp4|webm|mov|m4v|png|jpe?g|webp|gif)(\?|$)/i.test(v)
    );
}

/** Deep search for the first media URL in arbitrary Muapi payloads. */
export function extractMediaUrl(data, depth = 0) {
    if (data == null || depth > 8) return null;

    if (typeof data === 'string') {
        if (looksLikeMediaUrl(data)) {
            return data.startsWith('//') ? `https:${data}` : data;
        }
        const parsed = parseMaybeJson(data);
        if (parsed) return extractMediaUrl(parsed, depth + 1);
        return null;
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
        if (looksLikeMediaUrl(data[key])) {
            const v = data[key].trim();
            return v.startsWith('//') ? `https:${v}` : v;
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

function isVideoMedia(item, url, mediaType) {
    if (mediaType && mediaType !== 'video') return false;
    if (item?.media_type === 'video') return true;
    if (url && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return true;
    const model = item?.model_name || item?.model || '';
    if (VIDEO_MODEL_HINT.test(model)) return true;
    return mediaType !== 'image';
}

function isImageMedia(item, url, mediaType) {
    if (mediaType && mediaType !== 'image') return false;
    if (item?.media_type === 'image') return true;
    if (url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) return true;
    const model = item?.model_name || item?.model || '';
    if (IMAGE_MODEL_HINT.test(model)) return true;
    return mediaType !== 'video';
}

/** Map a Muapi gallery / usage row to a studio history card entry. */
export function galleryItemToHistoryEntry(item, mediaType) {
    if (!item) return null;

    const status = (item.status || '').toLowerCase();
    if (status && !COMPLETED_STATUSES.has(status)) return null;

    const output = normalizeOutputData(item);
    const input = normalizeInputData(item);
    const url = extractMediaUrl(output) || extractMediaUrl(item);
    if (!url) return null;

    if (mediaType === 'video' && !isVideoMedia(item, url, mediaType)) return null;
    if (mediaType === 'image' && !isImageMedia(item, url, mediaType)) return null;

    return {
        id: item.id || item.request_id || url,
        url,
        prompt: inferPrompt(output, input, item),
        model: item.model_name || item.model || output.model || '',
        timestamp: item.created_at || item.timestamp || new Date().toISOString(),
    };
}

/** Merge local and remote history; remote first, dedupe by id/url, newest first. */
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

/** Normalize studio-history API payloads (array or { results/items/history }). */
export function normalizeStudioHistoryPayload(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    return (
        data.results ||
        data.items ||
        data.history ||
        data.data ||
        []
    );
}
