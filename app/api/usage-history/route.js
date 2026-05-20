import { NextResponse } from 'next/server';
import { resolveMuapiKey } from '../../../lib/muapi-auth.js';
import { fetchMuapiRunHistory } from '../../../lib/muapi-server.js';

async function proxyUsage(apiKey, page) {
    const { ok, status, data } = await fetchMuapiRunHistory(apiKey, { page });
    return NextResponse.json(data, { status: ok ? 200 : status });
}

export async function GET(request) {
    const apiKey = await resolveMuapiKey(request);
    if (!apiKey) {
        return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }

    const page = Math.max(1, Number(new URL(request.url).searchParams.get('page') || '1'));
    try {
        return await proxyUsage(apiKey, page);
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

    const page = Math.max(1, Number(body.page || 1));
    try {
        return await proxyUsage(apiKey, page);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
