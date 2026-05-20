import { NextResponse } from 'next/server';
import { MUAPI_KEY_COOKIE, muapiKeyCookieOptions } from '../../../lib/muapi-auth.js';

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
    }

    const apiKey = (body?.apiKey || body?.key || '').trim();
    if (!apiKey) {
        return NextResponse.json({ detail: 'apiKey is required' }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(MUAPI_KEY_COOKIE, apiKey, muapiKeyCookieOptions());
    return response;
}

export async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(MUAPI_KEY_COOKIE, '', { ...muapiKeyCookieOptions(), maxAge: 0 });
    return response;
}
