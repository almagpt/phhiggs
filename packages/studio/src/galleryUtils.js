/** Extract a media URL from Muapi poll results, gallery output_data, etc. */
export function extractMediaUrl(data) {
    if (!data) return null;
    if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('/'))) {
        return data;
    }
    if (typeof data.url === 'string') return data.url;
    if (typeof data.video_url === 'string') return data.video_url;
    if (typeof data.image_url === 'string') return data.image_url;
    if (typeof data.output_url === 'string') return data.output_url;
    if (typeof data.media_url === 'string') return data.media_url;

    const outputs = data.outputs;
    if (Array.isArray(outputs) && outputs.length > 0) {
        const fromOutputs = extractMediaUrl(outputs[0]);
        if (fromOutputs) return fromOutputs;
    }

    if (data.output && typeof data.output === 'object') {
        const fromOutput = extractMediaUrl(data.output);
        if (fromOutput) return fromOutput;
    }

    if (data.output_data && typeof data.output_data === 'object') {
        const fromOutputData = extractMediaUrl(data.output_data);
        if (fromOutputData) return fromOutputData;
    }

    return null;
}

const COMPLETED_STATUSES = new Set(['completed', 'succeeded', 'success']);

/** Map a Muapi gallery row to a studio history card entry. */
export function galleryItemToHistoryEntry(item) {
    if (!item) return null;

    const status = (item.status || '').toLowerCase();
    if (status && !COMPLETED_STATUSES.has(status)) return null;

    const output =
        item.output_data && typeof item.output_data === 'object'
            ? item.output_data
            : {};

    const url = extractMediaUrl(output) || extractMediaUrl(item);
    if (!url) return null;

    return {
        id: item.id,
        url,
        prompt: output.prompt || output.input?.prompt || '',
        model: item.model_name || output.model || output.model_name || '',
        timestamp: item.created_at || new Date().toISOString(),
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
