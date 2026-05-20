import { NextResponse } from 'next/server';
import { resolveMuapiKey } from '../../../lib/muapi-auth.js';
import { fetchMuapiGallery, MUAPI_GALLERY_MEDIA_TYPES } from '../../../lib/muapi-server.js';

function parseGalleryQuery(searchParams, body = {}) {
    const rawType = searchParams.get('media_type') || body.media_type || body.mediaType || 'all';
    const mediaType = MUAPI_GALLERY_MEDIA_TYPES.includes(rawType) ? rawType : 'all';
    const page = Math.max(1, Number(searchParams.get('page') || body.page || 1));
    return { mediaType, page };
}

async function handleGallery(request, apiKey, query) {
    const { ok, status, data } = await fetchMuapiGallery(apiKey, query);
    return NextResponse.json(data, { status: ok ? 200 : status });
}

/** GET /api/gallery?media_type=video&page=1 — proxies Muapi GET /app/get_gallery_data */
export async function GET(request) {
    const apiKey = await resolveMuapiKey(request);
    if (!apiKey) {
        return NextResponse.json(
            { detail: 'Not authenticated. Add your Muapi API key (x-api-key) in Settings.' },
            { status: 401 },
        );
    }

    const { searchParams } = new URL(request.url);
    try {
        return await handleGallery(request, apiKey, parseGalleryQuery(searchParams));
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/** POST fallback: apiKey in JSON body when cookies are unavailable */
export async function POST(request) {
    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const apiKey = await resolveMuapiKey(request, body.apiKey || body.key);
    if (!apiKey) {
        return NextResponse.json(
            { detail: 'Not authenticated. Add your Muapi API key in Settings.' },
            { status: 401 },
        );
    }

    try {
        return await handleGallery(request, apiKey, parseGalleryQuery(new URLSearchParams(), body));
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
