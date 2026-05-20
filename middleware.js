import { NextResponse } from 'next/server';

function resolveApiKey(request) {
    return (
        request.headers.get('x-api-key') ||
        request.cookies.get('muapi_key')?.value ||
        null
    );
}

function withApiKeyHeaders(request) {
    const apiKey = resolveApiKey(request);
    if (!apiKey) return null;
    const headers = new Headers(request.headers);
    headers.set('x-api-key', apiKey);
    return headers;
}

export function middleware(request) {
    const url = request.nextUrl;

    const isHandledByRoute =
        url.pathname.startsWith('/api/v1/creative-agent') ||
        url.pathname.startsWith('/api/v1/get_upload_url') ||
        url.pathname.startsWith('/api/v1/upload-binary');

    if (url.pathname.startsWith('/api/v1') && !isHandledByRoute) {
        const targetUrl = new URL(url.pathname + url.search, 'https://api.muapi.ai');
        const headers = withApiKeyHeaders(request);
        if (headers) {
            return NextResponse.rewrite(targetUrl, { request: { headers } });
        }
        return NextResponse.rewrite(targetUrl);
    }

    if (url.pathname.startsWith('/api/app')) {
        const headers = withApiKeyHeaders(request);
        if (headers) {
            return NextResponse.next({ request: { headers } });
        }
    }

    return NextResponse.next();
}

// Match the paths we want to proxy
export const config = {
    matcher: [
        '/api/workflow/:path*', 
        '/api/app/:path*',
        '/api/v1/:path*'
    ],
};
