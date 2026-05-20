import { NextResponse } from 'next/server';
import { getMuapiKeyFromRequest } from '../../../../lib/muapi-auth.js';

const MUAPI_BASE = 'https://api.muapi.ai';

function cleanHeaders(request) {
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('cookie');
    return headers;
}

function unauthorized() {
    return NextResponse.json(
        { detail: 'Not authenticated. Open Settings and save your Muapi API key again.' },
        { status: 401 },
    );
}

async function proxyToMuapi(request, targetUrl) {
    const headers = cleanHeaders(request);
    const apiKey = getMuapiKeyFromRequest(request);
    if (!apiKey) return unauthorized();
    headers.set('x-api-key', apiKey);

    const response = await fetch(targetUrl, {
        headers,
        method: request.method,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

export async function GET(request, { params }) {
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');

    const effectivePath = path === 'get_upload_file' ? 'get_file_upload_url' : path;

    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/app/${effectivePath}${search}`;

    const apiKey = getMuapiKeyFromRequest(request);
    if (!apiKey) return unauthorized();

    const headers = cleanHeaders(request);
    headers.set('x-api-key', apiKey);

    try {
        const response = await fetch(targetUrl, { headers, method: 'GET' });
        const data = await response.json();

        if (effectivePath === 'get_file_upload_url' && data.url) {
            const originalS3Url = data.url;
            data.url = `/api/upload-binary`;
            data.fields = {
                ...data.fields,
                'x-proxy-target-url': originalS3Url,
            };
        }

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/app/${path}${search}`;
    try {
        return await proxyToMuapi(request, targetUrl);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/app/${path}${search}`;
    try {
        return await proxyToMuapi(request, targetUrl);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/app/${path}${search}`;
    try {
        return await proxyToMuapi(request, targetUrl);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
