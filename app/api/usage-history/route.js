import { NextResponse } from 'next/server';
import { resolveMuapiKey } from '../../../lib/muapi-auth.js';

const MUAPI_BASE = 'https://api.muapi.ai';

export async function GET(request) {
    const apiKey = await resolveMuapiKey(request);
    if (!apiKey) {
        return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';

    try {
        const response = await fetch(
            `${MUAPI_BASE}/app/get_run_history_data?page=${page}&include_count=false`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
            },
        );
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const apiKey = await resolveMuapiKey(request, body.apiKey || body.key);
    if (!apiKey) {
        return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }

    const page = String(body.page || 1);

    try {
        const response = await fetch(
            `${MUAPI_BASE}/app/get_run_history_data?page=${page}&include_count=false`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
            },
        );
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
