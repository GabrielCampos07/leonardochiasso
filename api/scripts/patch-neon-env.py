#!/usr/bin/env python3
"""Normalize Neon DATABASE_URL for Prisma (pooler + DIRECT_URL). Idempotent."""
from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

ENV_PATH = Path(__file__).resolve().parents[1] / '.env'


def patch_database_url(url: str) -> tuple[str, str]:
    parsed = urlparse(url)
    params = {k: v[0] for k, v in parse_qs(parsed.query, keep_blank_values=True).items()}
    params['sslmode'] = 'require'
    params.pop('channel_binding', None)
    params['pgbouncer'] = 'true'
    params.setdefault('connect_timeout', '15')
    params.setdefault('pool_timeout', '30')
    new_url = urlunparse(
        (parsed.scheme, parsed.netloc, parsed.path, '', urlencode(params), ''),
    )

    host = parsed.hostname or ''
    direct_host = host.replace('-pooler', '') if '-pooler' in host else host
    direct_netloc = parsed.netloc.replace(host, direct_host)
    direct_url = urlunparse(
        (parsed.scheme, direct_netloc, parsed.path, '', 'sslmode=require', ''),
    )
    return new_url, direct_url


def main() -> None:
    if not ENV_PATH.is_file():
        raise SystemExit(f'Missing {ENV_PATH}')

    text = ENV_PATH.read_text()
    match = re.search(r'^(DATABASE_URL=")([^"]+)(")', text, re.M)
    if not match:
        raise SystemExit('DATABASE_URL not found in .env')

    new_url, direct_url = patch_database_url(match.group(2))
    text = text[: match.start(2)] + new_url + text[match.end(2) :]

    if re.search(r'^DIRECT_URL=', text, re.M):
        text = re.sub(
            r'^DIRECT_URL="[^"]*"',
            f'DIRECT_URL="{direct_url}"',
            text,
            flags=re.M,
        )
    else:
        text = re.sub(
            r'^(DATABASE_URL="[^"]*")',
            rf'\1\nDIRECT_URL="{direct_url}"',
            text,
            flags=re.M,
        )

    ENV_PATH.write_text(text)
    print('Patched Neon DATABASE_URL and DIRECT_URL in .env')


if __name__ == '__main__':
    main()
