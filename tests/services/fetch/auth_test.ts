import {
  applyAuthToRequest,
  type AuthConfig,
  authConfigCacheKey,
  inferGithubLocation,
  loadAuthConfigFromEnv,
  redactAuthHeaders,
} from '../../../src/services/fetch/auth';

describe('[auth] loadAuthConfigFromEnv', () => {
  it('defaults to "none" when no env vars are set', () => {
    expect(loadAuthConfigFromEnv({})).toEqual({ type: 'none' });
  });

  it('treats explicit "none" the same as unset', () => {
    expect(loadAuthConfigFromEnv({ MKDOCS_AUTH_TYPE: 'none' })).toEqual({ type: 'none' });
  });

  it('reads github-api config from MKDOCS_GITHUB_TOKEN', () => {
    const cfg = loadAuthConfigFromEnv({
      MKDOCS_AUTH_TYPE: 'github-api',
      MKDOCS_GITHUB_TOKEN: 'ghp_abc',
    });
    expect(cfg).toEqual({
      type: 'github-api',
      token: 'ghp_abc',
      owner: undefined,
      repo: undefined,
      ref: 'gh-pages',
      subPath: '',
    });
  });

  it('falls back to GITHUB_TOKEN, then GITHUB_PERSONAL_ACCESS_TOKEN', () => {
    const cfg1 = loadAuthConfigFromEnv({
      MKDOCS_AUTH_TYPE: 'github-api',
      GITHUB_TOKEN: 'gh_token',
    });
    expect(cfg1).toMatchObject({ type: 'github-api', token: 'gh_token' });

    const cfg2 = loadAuthConfigFromEnv({
      MKDOCS_AUTH_TYPE: 'github-api',
      GITHUB_PERSONAL_ACCESS_TOKEN: 'pat_token',
    });
    expect(cfg2).toMatchObject({ type: 'github-api', token: 'pat_token' });
  });

  it('honours owner / repo / ref / subPath overrides', () => {
    const cfg = loadAuthConfigFromEnv({
      MKDOCS_AUTH_TYPE: 'github-api',
      MKDOCS_GITHUB_TOKEN: 'tok',
      MKDOCS_GITHUB_OWNER: 'acme',
      MKDOCS_GITHUB_REPO: 'docs',
      MKDOCS_GITHUB_REF: 'main',
      MKDOCS_GITHUB_SUBPATH: 'site',
    });
    expect(cfg).toEqual({
      type: 'github-api',
      token: 'tok',
      owner: 'acme',
      repo: 'docs',
      ref: 'main',
      subPath: 'site',
    });
  });

  it('throws when github-api is selected without a token', () => {
    expect(() => loadAuthConfigFromEnv({ MKDOCS_AUTH_TYPE: 'github-api' })).toThrow(
      /requires a token/i
    );
  });

  it('throws on unsupported auth type', () => {
    expect(() => loadAuthConfigFromEnv({ MKDOCS_AUTH_TYPE: 'oauth' })).toThrow(
      /Unsupported MKDOCS_AUTH_TYPE/i
    );
  });
});

describe('[auth] inferGithubLocation', () => {
  it('parses a project pages URL with no trailing path', () => {
    expect(inferGithubLocation('https://acme.github.io/docs')).toEqual({
      owner: 'acme',
      repo: 'docs',
      path: 'index.html',
    });
  });

  it('parses a project pages URL with trailing slash on root', () => {
    expect(inferGithubLocation('https://acme.github.io/docs/')).toEqual({
      owner: 'acme',
      repo: 'docs',
      path: 'index.html',
    });
  });

  it('normalises directory-style sub-pages to <dir>/index.html', () => {
    expect(inferGithubLocation('https://acme.github.io/docs/getting-started/')).toEqual({
      owner: 'acme',
      repo: 'docs',
      path: 'getting-started/index.html',
    });
  });

  it('keeps real file paths as-is', () => {
    expect(
      inferGithubLocation('https://acme.github.io/docs/search/search_index.json')
    ).toEqual({
      owner: 'acme',
      repo: 'docs',
      path: 'search/search_index.json',
    });
  });

  it('returns null for non-github.io hosts', () => {
    expect(inferGithubLocation('https://example.com/foo')).toBeNull();
  });

  it('returns null for the org/user root pages site (no project segment)', () => {
    expect(inferGithubLocation('https://acme.github.io/')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(inferGithubLocation('not a url')).toBeNull();
  });
});

describe('[auth] applyAuthToRequest', () => {
  const cfg: AuthConfig = {
    type: 'github-api',
    token: 'gh_secret',
    ref: 'gh-pages',
    subPath: '',
  };

  it('is a no-op for the "none" scheme', () => {
    const out = applyAuthToRequest(
      'https://example.com/foo',
      { Accept: 'application/json' },
      { type: 'none' }
    );
    expect(out.url).toBe('https://example.com/foo');
    expect(out.headers).toEqual({ Accept: 'application/json' });
  });

  it('rewrites a project pages URL to the GitHub Contents API', () => {
    const out = applyAuthToRequest(
      'https://acme.github.io/docs/search/search_index.json',
      { Accept: 'application/json' },
      cfg
    );
    expect(out.url).toBe(
      'https://api.github.com/repos/acme/docs/contents/search/search_index.json?ref=gh-pages'
    );
    expect(out.headers.Authorization).toBe('Bearer gh_secret');
    expect(out.headers.Accept).toBe('application/vnd.github.raw');
    expect(out.headers['X-GitHub-Api-Version']).toBe('2022-11-28');
  });

  it('uses the configured ref when overriding the default', () => {
    const out = applyAuthToRequest('https://acme.github.io/docs/versions.json', undefined, {
      ...cfg,
      ref: 'main',
    });
    expect(out.url).toBe(
      'https://api.github.com/repos/acme/docs/contents/versions.json?ref=main'
    );
  });

  it('prepends configured subPath to the inferred path', () => {
    const out = applyAuthToRequest(
      'https://acme.github.io/docs/getting-started/',
      undefined,
      { ...cfg, subPath: 'site' }
    );
    expect(out.url).toBe(
      'https://api.github.com/repos/acme/docs/contents/site/getting-started/index.html?ref=gh-pages'
    );
  });

  it('strips leading/trailing slashes from subPath', () => {
    const out = applyAuthToRequest(
      'https://acme.github.io/docs/index.html',
      undefined,
      { ...cfg, subPath: '/site/' }
    );
    expect(out.url).toBe(
      'https://api.github.com/repos/acme/docs/contents/site/index.html?ref=gh-pages'
    );
  });

  it('uses owner/repo overrides when URL is a custom domain', () => {
    const out = applyAuthToRequest(
      'https://docs.acme.example/getting-started/',
      undefined,
      { ...cfg, owner: 'acme-org', repo: 'private-docs' }
    );
    expect(out.url).toBe(
      'https://api.github.com/repos/acme-org/private-docs/contents/getting-started/index.html?ref=gh-pages'
    );
  });

  it('passes through api.github.com URLs unchanged but injects auth headers', () => {
    const out = applyAuthToRequest(
      'https://api.github.com/repos/acme/docs/contents/foo.json?ref=gh-pages',
      { 'User-Agent': 'cline' },
      cfg
    );
    expect(out.url).toBe(
      'https://api.github.com/repos/acme/docs/contents/foo.json?ref=gh-pages'
    );
    expect(out.headers.Authorization).toBe('Bearer gh_secret');
    expect(out.headers['User-Agent']).toBe('cline');
  });

  it('leaves request unchanged when owner/repo cannot be inferred', () => {
    const out = applyAuthToRequest('https://example.com/foo', undefined, cfg);
    expect(out.url).toBe('https://example.com/foo');
    expect(out.headers.Authorization).toBeUndefined();
  });

  it('encodes path segments individually but preserves slashes', () => {
    const out = applyAuthToRequest(
      'https://acme.github.io/docs/with space/page.html',
      undefined,
      cfg
    );
    expect(out.url).toBe(
      'https://api.github.com/repos/acme/docs/contents/with%20space/page.html?ref=gh-pages'
    );
  });

  it('accepts Headers-like inputs as well as plain objects', () => {
    // Mimic the Headers iteration contract (forEach(value, key)) without
    // actually relying on the Node-built-in Headers class so the test is
    // independent of node-fetch / undici versions.
    const entries: Array<[string, string]> = [['Accept', 'application/json']];
    const headers = {
      forEach(cb: (value: string, key: string) => void) {
        for (const [k, v] of entries) cb(v, k);
      },
    } as unknown as Headers;

    const out = applyAuthToRequest('https://acme.github.io/docs/index.html', headers, cfg);
    expect(out.headers.Accept).toBe('application/vnd.github.raw');
  });
});

describe('[auth] authConfigCacheKey', () => {
  it('returns a stable "public" key for the none scheme', () => {
    expect(authConfigCacheKey({ type: 'none' })).toBe('public');
  });

  it('returns a stable, prefixed hash for the github-api scheme', () => {
    const key1 = authConfigCacheKey({ type: 'github-api', token: 't1', ref: 'gh-pages' });
    const key2 = authConfigCacheKey({ type: 'github-api', token: 't1', ref: 'gh-pages' });
    expect(key1).toBe(key2);
    expect(key1.startsWith('gh-api-')).toBe(true);
  });

  it('produces a different key when any auth field differs', () => {
    const a = authConfigCacheKey({ type: 'github-api', token: 't1', ref: 'gh-pages' });
    const b = authConfigCacheKey({ type: 'github-api', token: 't2', ref: 'gh-pages' });
    const c = authConfigCacheKey({ type: 'github-api', token: 't1', ref: 'main' });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('[auth] redactAuthHeaders', () => {
  it('redacts Authorization, Cookie, and X-API-Key (case-insensitively)', () => {
    expect(
      redactAuthHeaders({
        authorization: 'Bearer secret',
        Cookie: 'session=abc',
        'X-Api-Key': 'k',
        'X-Other': 'visible',
      })
    ).toEqual({
      authorization: '<redacted>',
      Cookie: '<redacted>',
      'X-Api-Key': '<redacted>',
      'X-Other': 'visible',
    });
  });
});
