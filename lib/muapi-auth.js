export const MUAPI_KEY_COOKIE = 'muapi_key';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readHeaderKey(request) {
    const headerKey =
        request.headers.get('x-api-key') ||
        request.headers.get('X-API-Key');
    if (headerKey?.trim()) return headerKey.trim();

    const auth = request.headers.get('authorization');
    if (auth?.toLowerCase().startsWith('bearer ')) {
        const token = auth.slice(7).trim();
        if (token) return token;
    }

    return null;
}

/** Read Muapi API key from request headers (sync). */
export function getMuapiKeyFromRequest(request) {
    const header = readHeaderKey(request);
    if (header) return header;

    const cookieKey = request.cookies.get(MUAPI_KEY_COOKIE)?.value;
    if (cookieKey?.trim()) return cookieKey.trim();

    return null;
}

/** Resolve API key: header → Next cookies() → request.cookies (Next 15). */
export async function resolveMuapiKey(request, bodyKey) {
    const fromBody = typeof bodyKey === 'string' ? bodyKey.trim() : '';
    if (fromBody) return fromBody;

    const fromHeader = readHeaderKey(request);
    if (fromHeader) return fromHeader;

    try {
        const { cookies } = await import('next/headers');
        const store = await cookies();
        const fromStore = store.get(MUAPI_KEY_COOKIE)?.value;
        if (fromStore?.trim()) return fromStore.trim();
    } catch {
        // cookies() unavailable outside request context
    }

    const fromRequestCookie = request.cookies.get(MUAPI_KEY_COOKIE)?.value;
    if (fromRequestCookie?.trim()) return fromRequestCookie.trim();

    return null;
}

/** Cookie options for server-set session (Vercel is always HTTPS). */
export function muapiKeyCookieOptions() {
    const onVercel = process.env.VERCEL === '1';
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: onVercel || isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
    };
}
