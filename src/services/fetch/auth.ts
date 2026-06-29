/**
 * Authentication support for the FetchService.
 *
 * Currently supported schemes:
 *  - `none`        : no authentication (default, public sites)
 *  - `github-api`  : transparently rewrite requests targeted at a GitHub Pages
 *                    site so that they are served via the GitHub Contents REST
 *                    API using a Personal Access Token (PAT).
 *
 * The "github-api" scheme is the only practical way today to read a private
 * GitHub Pages site (`x-pages-private: 1`) using just a token, because the
 * Pages CDN itself only honours browser session cookies — it does NOT honour
 * `Authorization: Bearer <PAT>`. Instead of fighting that, we keep all
 * downstream code unchanged (lunr index parsing, HTML→Markdown conversion,
 * etc.) and just change the transport: we map a URL such as
 *   https://<owner>.github.io/<repo>/<path>
 * into
 *   https://api.github.com/repos/<owner>/<repo>/contents/<built-path>?ref=<ref>
 * with `Accept: application/vnd.github.raw` so the response body is the raw
 * file bytes — exactly what the rest of the pipeline expects.
 */
import { createHash } from 'crypto';

import { logger } from '../logger';

/**
 * Type marker for "no authentication required".
 */
export interface NoAuthConfig {
  type: 'none';
}

/**
 * Configuration for the github-api transport. All fields except `token` are
 * optional and will be inferred from the request URL when it follows the
 * conventional `https://<owner>.github.io/<repo>/...` shape.
 */
export interface GithubApiAuthConfig {
  type: 'github-api';
  /** GitHub Personal Access Token (classic or fine-grained). */
  token: string;
  /** Override repository owner. Inferred from URL host when not set. */
  owner?: string;
  /** Override repository name. Inferred from URL path when not set. */
  repo?: string;
  /** Branch / tag / sha that holds the built MkDocs site. Defaults to `gh-pages`. */
  ref?: string;
  /** Optional sub-path inside the ref (e.g. `docs/` if the site lives there). */
  subPath?: string;
}

export type AuthConfig = NoAuthConfig | GithubApiAuthConfig;

/**
 * Result of applying authentication to an outbound request.
 */
export interface AuthApplied {
  url: string;
  headers: Record<string, string>;
}

/**
 * Owner / repo / path inferred from a `*.github.io/<repo>/...` URL.
 */
export interface UrlInference {
  owner: string;
  repo: string;
  path: string;
}

const SUPPORTED_AUTH_TYPES = ['none', 'github-api'] as const;

/**
 * Read auth configuration from environment variables. This is intentionally
 * permissive on success and strict on misconfiguration: if the user opts in
 * to an auth scheme but forgets a required value, we throw at startup rather
 * than fall back silently.
 */
export const loadAuthConfigFromEnv = (env: NodeJS.ProcessEnv = process.env): AuthConfig => {
  const rawType = (env.MKDOCS_AUTH_TYPE || 'none').trim().toLowerCase();

  if (rawType === '' || rawType === 'none') {
    return { type: 'none' };
  }

  if (rawType === 'github-api') {
    const token =
      env.MKDOCS_GITHUB_TOKEN ||
      env.GITHUB_TOKEN ||
      env.GITHUB_PERSONAL_ACCESS_TOKEN;

    if (!token) {
      throw new Error(
        'MKDOCS_AUTH_TYPE=github-api requires a token via one of: ' +
          'MKDOCS_GITHUB_TOKEN, GITHUB_TOKEN, GITHUB_PERSONAL_ACCESS_TOKEN.'
      );
    }

    return {
      type: 'github-api',
      token,
      owner: env.MKDOCS_GITHUB_OWNER || undefined,
      repo: env.MKDOCS_GITHUB_REPO || undefined,
      ref: env.MKDOCS_GITHUB_REF || 'gh-pages',
      subPath: env.MKDOCS_GITHUB_SUBPATH || '',
    };
  }

  throw new Error(
    `Unsupported MKDOCS_AUTH_TYPE: '${rawType}'. Supported values: ${SUPPORTED_AUTH_TYPES.join(', ')}.`
  );
};

/**
 * Try to extract `owner / repo / path` from a conventional GitHub Pages URL
 * of the form `https://<owner>.github.io/<repo>/<path>`. The returned `path`
 * is normalised so that directory-style URLs become `<dir>/index.html`,
 * matching how MkDocs publishes sites to the `gh-pages` branch.
 *
 * Returns `null` for URLs that don't match the pattern (e.g. user/org pages
 * roots, custom domains, or non-GitHub URLs).
 */
export const inferGithubLocation = (urlStr: string): UrlInference | null => {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const ghIoMatch = host.match(/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.github\.io$/);
  if (!ghIoMatch) return null;

  const owner = ghIoMatch[1];
  const segments = parsed.pathname.split('/').filter(Boolean);
  // For a project pages site the first segment is the repo name.
  // The org/user root site (https://<owner>.github.io/) has no first segment,
  // which we don't currently support — there is no repo to address.
  if (segments.length === 0) return null;

  const repo = segments[0];
  const remainder = segments.slice(1).join('/');
  const endsWithSlash = parsed.pathname.endsWith('/');

  const path = normaliseToFile(remainder, endsWithSlash);
  return { owner, repo, path };
};

/**
 * Normalise a relative path inside a published MkDocs site to the file that
 * actually exists in the `gh-pages` branch. MkDocs (with `use_directory_urls`,
 * the default) emits every page as `<page>/index.html`, so:
 *   ''               (root, with or without trailing slash) -> 'index.html'
 *   'foo/' or 'foo'  (no extension)                          -> 'foo/index.html'
 *   'foo/bar.json'                                            -> 'foo/bar.json'
 */
const normaliseToFile = (relativePath: string, endsWithSlash: boolean): string => {
  if (relativePath === '') return 'index.html';

  if (endsWithSlash) {
    return `${relativePath}/index.html`;
  }

  const lastSegment = relativePath.split('/').pop() || '';
  if (!lastSegment.includes('.')) {
    return `${relativePath}/index.html`;
  }

  return relativePath;
};

/**
 * Apply the configured auth to an outbound request, returning the (possibly
 * rewritten) URL and the (possibly augmented) headers. Pure function — no
 * side effects, easy to test.
 */
export const applyAuthToRequest = (
  urlStr: string,
  headers: Record<string, string> | Headers | undefined,
  config: AuthConfig
): AuthApplied => {
  const headerObj = normaliseHeaders(headers);

  if (config.type === 'none') {
    return { url: urlStr, headers: headerObj };
  }

  if (config.type === 'github-api') {
    return rewriteToGithubApi(urlStr, headerObj, config);
  }

  return { url: urlStr, headers: headerObj };
};

const normaliseHeaders = (
  h: Record<string, string> | Headers | undefined
): Record<string, string> => {
  if (!h) return {};
  // Detect Headers-like object via duck typing (Headers vs plain object).
  const maybeHeaders = h as { forEach?: unknown };
  if (typeof maybeHeaders.forEach === 'function') {
    const out: Record<string, string> = {};
    (h as Headers).forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  return { ...(h as Record<string, string>) };
};

const rewriteToGithubApi = (
  urlStr: string,
  headers: Record<string, string>,
  config: GithubApiAuthConfig
): AuthApplied => {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    // Malformed URL: leave unchanged so the underlying fetcher reports the
    // real error rather than us turning it into a confusing rewrite failure.
    return { url: urlStr, headers };
  }

  // If the caller is already targeting api.github.com (e.g. another tool
  // composed on top of this one), just inject auth and pass through.
  if (parsed.hostname.toLowerCase() === 'api.github.com') {
    return { url: urlStr, headers: { ...headers, ...buildGithubApiHeaders(config) } };
  }

  let owner: string | undefined = config.owner;
  let repo: string | undefined = config.repo;
  let path: string | undefined;

  const inferred = inferGithubLocation(urlStr);
  if (inferred) {
    owner = owner || inferred.owner;
    repo = repo || inferred.repo;
    path = inferred.path;
  } else if (owner && repo) {
    // Custom domain or non-github.io URL. Use the URL path verbatim, after
    // applying the same MkDocs directory→index.html normalisation.
    const segments = parsed.pathname.split('/').filter(Boolean);
    const remainder = segments.join('/');
    path = normaliseToFile(remainder, parsed.pathname.endsWith('/') || segments.length === 0);
  }

  if (!owner || !repo || !path) {
    // Couldn't figure out where to fetch from — leave the request untouched
    // so that error reporting stays close to the original failure.
    logger.debug(
      `github-api auth: could not infer owner/repo/path from ${urlStr}; leaving request unchanged.`
    );
    return { url: urlStr, headers };
  }

  const subPath = (config.subPath || '').replace(/^\/+|\/+$/g, '');
  const fullPath = subPath ? `${subPath}/${path}` : path;

  const ref = config.ref || 'gh-pages';
  const apiUrl =
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` +
    `/contents/${encodePathPreservingSlashes(fullPath)}` +
    `?ref=${encodeURIComponent(ref)}`;

  logger.debug(`github-api auth: rewrote ${urlStr} -> ${apiUrl}`);

  return {
    url: apiUrl,
    headers: { ...headers, ...buildGithubApiHeaders(config) },
  };
};

const encodePathPreservingSlashes = (p: string): string =>
  p
    .split('/')
    .map((segment) => {
      // Segments coming from URL.pathname are already percent-encoded.
      // Decode first so we don't end up with double-encoded sequences like
      // `%2520` for a literal space.
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // Leave the segment as-is if it isn't a valid percent-encoded string.
      }
      return encodeURIComponent(decoded);
    })
    .join('/');

const buildGithubApiHeaders = (config: GithubApiAuthConfig): Record<string, string> => ({
  Authorization: `Bearer ${config.token}`,
  // Ask GitHub for the file bytes directly. With this Accept header the
  // response body is the raw file content, so .text() / .json() / etc.
  // continue to work as before.
  Accept: 'application/vnd.github.raw',
  'X-GitHub-Api-Version': '2022-11-28',
});

/**
 * Stable, low-cardinality identifier for an auth configuration. Used to scope
 * on-disk caches so that two different identities sharing a `CACHE_BASE_PATH`
 * never read each other's cached responses.
 */
export const authConfigCacheKey = (config: AuthConfig): string => {
  if (config.type === 'none') return 'public';

  if (config.type === 'github-api') {
    const material = [
      config.type,
      config.token,
      config.owner ?? '',
      config.repo ?? '',
      config.ref ?? '',
      config.subPath ?? '',
    ].join('|');
    const digest = createHash('sha256').update(material).digest('hex').slice(0, 16);
    return `gh-api-${digest}`;
  }

  return 'unknown';
};

/**
 * Return a copy of `headers` with secrets redacted. Used for safe logging.
 */
export const redactAuthHeaders = (
  headers: Record<string, string>
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (lower === 'authorization' || lower === 'cookie' || lower === 'x-api-key') {
      out[key] = '<redacted>';
    } else {
      out[key] = value;
    }
  }
  return out;
};
