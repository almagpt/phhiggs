import { NextResponse } from 'next/server';
import { resolveMuapiKey } from '../../../lib/muapi-auth.js';

const MUAPI_BASE = 'https://api.muapi.ai';

async function proxyGallery(apiKey, { mediaType, page = 1 }) {
    const params = new URLSearchParams({ page: String(page) });
    if (mediaType) params.set('media_type', mediaType);

    const response = await fetch(
        `${MUAPI_BASE}/app/get_gallery_data?${params}`,
        {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
        },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

export async function GET(request) {
    const apiKey = await resolveMuapiKey(request);
    if (!apiKey) {
        return NextResponse.json(
            { detail: 'Not authenticated. Save your Muapi API key in Settings.' },
            { status: 401 },
        );
    }

    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get('media_type') || undefined;
    const page = Number(searchParams.get('page') || '1');

    try {
        return await proxyGallery(apiKey, { mediaType, page });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/** POST carries apiKey in body when httpOnly cookie is not sent (Vercel-safe). */
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
            { detail: 'Not authenticated. Save your Muapi API key in Settings.' },
            { status: 401 },
        );
    }

    const mediaType = body.media_type || body.mediaType;
    const page = Number(body.page || 1);

    try {
        return await proxyGallery(apiKey, { mediaType, page });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
