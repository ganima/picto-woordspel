// An in-memory stand-in for the parts of Supabase this app uses (auth with password, PostgREST tables,
// the media bucket), so staff flows can be tested end to end without touching the real project.
// Framework-agnostic: hand it a request, get a response back.

export interface FakeRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Uint8Array | null;
}
export interface FakeResponse {
  status: number;
  headers: Record<string, string>;
  body: string | Uint8Array;
}

type Row = Record<string, unknown>;
interface Account { id: string; email: string; password: string }

const json = (status: number, data: unknown): FakeResponse => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: data === undefined ? '' : JSON.stringify(data),
});
const text = (b: Uint8Array | null) => (b ? new TextDecoder().decode(b) : '');
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const DEFAULTS: Record<string, () => Row> = {
  themes: () => ({ id: uuid(), name: '', visible: false, sort: 0, created_at: now(), updated_at: now() }),
  theme_items: () => ({ id: uuid(), word: '', audio_path: null, options: {}, sort: 0, created_at: now() }),
  games: () => ({ available: true, visible: true, sort: 0, settings: {} }),
  game_sets: () => ({ id: uuid(), name: '', visible: false, data: {}, sort: 0, created_at: now(), updated_at: now() }),
  staff: () => ({ email: '', display_name: '', created_at: now() }),
};

export class FakeSupabase {
  tables: Record<string, Row[]> = { themes: [], theme_items: [], games: [], game_sets: [], staff: [] };
  files = new Map<string, { type: string; bytes: Uint8Array }>();
  accounts: Account[] = [];
  /** Every request seen, for assertions ("method path"). */
  log: string[] = [];

  addAccount(email: string, password: string, role?: 'admin' | 'juf'): string {
    const id = uuid();
    this.accounts.push({ id, email, password });
    if (role) this.tables.staff!.push({ ...DEFAULTS.staff!(), user_id: id, role, email });
    return id;
  }

  handle(req: FakeRequest): FakeResponse {
    const url = new URL(req.url);
    const path = decodeURIComponent(url.pathname);
    this.log.push(`${req.method} ${path}`);
    if (req.method === 'OPTIONS') return { status: 204, headers: {}, body: '' };
    if (path.startsWith('/auth/v1/')) return this.auth(req, path.slice(9), url);
    if (path.startsWith('/rest/v1/')) return this.rest(req, path.slice(9), url);
    if (path.startsWith('/storage/v1/')) return this.storage(req, path.slice(12));
    return json(404, { message: 'not faked: ' + path });
  }

  // ---- auth ----
  private auth(req: FakeRequest, path: string, url: URL): FakeResponse {
    if (path === 'token' && url.searchParams.get('grant_type') === 'password') {
      const { email, password } = JSON.parse(text(req.body));
      const acc = this.accounts.find((a) => a.email === email && a.password === password);
      if (!acc) return json(400, { code: 'invalid_credentials', error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials' });
      const user = { id: acc.id, aud: 'authenticated', role: 'authenticated', email: acc.email, app_metadata: {}, user_metadata: {}, created_at: now() };
      const exp = Math.floor(Date.now() / 1000) + 3600;
      return json(200, { access_token: `fake.${acc.id}`, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'fake-refresh', user });
    }
    if (path === 'logout') return { status: 204, headers: {}, body: '' };
    if (path === 'user') {
      const acc = this.accounts.find((a) => req.headers.authorization === `Bearer fake.${a.id}`);
      return acc ? json(200, { id: acc.id, email: acc.email, aud: 'authenticated' }) : json(401, { message: 'no user' });
    }
    return json(404, { message: 'auth not faked: ' + path });
  }

  // ---- PostgREST ----
  private matches(row: Row, url: URL): boolean {
    for (const [k, v] of url.searchParams) {
      if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(k)) continue;
      const [op, ...rest] = v.split('.');
      const val = rest.join('.');
      const cell = row[k];
      if (op === 'eq' && String(cell) !== val) return false;
      if (op === 'neq' && String(cell) === val) return false;
      if (op === 'is' && !(val === 'null' ? cell == null : String(cell) === val)) return false;
      if (op === 'in' && !val.slice(1, -1).split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(cell))) return false;
    }
    return true;
  }

  private ordered(rows: Row[], url: URL): Row[] {
    const order = url.searchParams.getAll('order').flatMap((o) => o.split(','));
    return rows.slice().sort((a, b) => {
      for (const o of order) {
        const [col, dir] = o.split('.');
        const x = a[col!] as string | number, y = b[col!] as string | number;
        if (x === y) continue;
        return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1);
      }
      return 0;
    });
  }

  private rest(req: FakeRequest, table: string, url: URL): FakeResponse {
    const rows = this.tables[table];
    if (!rows) return json(404, { message: 'no table ' + table });
    const wantsObject = (req.headers.accept ?? '').includes('vnd.pgrst.object');
    const returning = (req.headers.prefer ?? '').includes('return=representation');
    const reply = (list: Row[], status = 200): FakeResponse => {
      if (!wantsObject) return json(status, list);
      if (list.length !== 1) return json(406, { code: 'PGRST116', details: `The result contains ${list.length} rows`, hint: null, message: 'JSON object requested, multiple (or no) rows returned' });
      return json(status, list[0]);
    };

    if (req.method === 'GET' || req.method === 'HEAD') return reply(this.ordered(rows.filter((r) => this.matches(r, url)), url));

    if (req.method === 'POST') {
      const body = JSON.parse(text(req.body));
      const added = (Array.isArray(body) ? body : [body]).map((b: Row) => ({ ...DEFAULTS[table]!(), ...b }));
      rows.push(...added);
      return returning ? reply(added, 201) : { status: 201, headers: {}, body: '' };
    }
    if (req.method === 'PATCH') {
      const patch = JSON.parse(text(req.body));
      const hit = rows.filter((r) => this.matches(r, url));
      if (table === 'games' && 'available' in patch) return json(403, { code: '42501', message: 'Only an admin can change which games are available.' });
      hit.forEach((r) => Object.assign(r, patch, table === 'themes' ? { updated_at: now() } : {}));
      return returning ? reply(hit) : { status: 204, headers: {}, body: '' };
    }
    if (req.method === 'DELETE') {
      const hit = rows.filter((r) => this.matches(r, url));
      this.tables[table] = rows.filter((r) => !hit.includes(r));
      if (table === 'themes') {
        const ids = new Set(hit.map((r) => r.id));
        this.tables.theme_items = this.tables.theme_items!.filter((i) => !ids.has(i.theme_id));
      }
      return returning ? reply(hit) : { status: 204, headers: {}, body: '' };
    }
    return json(405, { message: req.method });
  }

  // ---- storage (bucket "media") ----
  private storage(req: FakeRequest, path: string): FakeResponse {
    if (req.method === 'GET' && path.startsWith('object/public/media/')) {
      const f = this.files.get(path.slice('object/public/media/'.length));
      return f ? { status: 200, headers: { 'content-type': f.type, 'access-control-allow-origin': '*' }, body: f.bytes } : json(404, { message: 'Object not found' });
    }
    if (req.method === 'POST' && path.startsWith('object/list/media')) {
      const { prefix = '' } = JSON.parse(text(req.body));
      const dir = prefix.replace(/\/?$/, '/');
      const names = [...this.files.keys()].filter((k) => k.startsWith(dir) && !k.slice(dir.length).includes('/'));
      return json(200, names.map((k) => ({ name: k.slice(dir.length), id: k, metadata: {} })));
    }
    if (req.method === 'POST' && path.startsWith('object/media/')) {
      const key = path.slice('object/media/'.length);
      if (this.files.has(key) && req.headers['x-upsert'] !== 'true') return json(400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
      const file = parseMultipart(req.body!, req.headers['content-type'] ?? '') ?? { type: req.headers['content-type'] ?? 'application/octet-stream', bytes: req.body! };
      this.files.set(key, file);
      return json(200, { Key: `media/${key}`, Id: uuid() });
    }
    if (req.method === 'DELETE' && (path === 'object/media' || path === 'object/media/')) {
      const { prefixes = [] } = JSON.parse(text(req.body));
      const gone = (prefixes as string[]).filter((p) => this.files.delete(p));
      return json(200, gone.map((name) => ({ name })));
    }
    return json(404, { message: 'storage not faked: ' + req.method + ' ' + path });
  }
}

/** The file part of a multipart/form-data body (storage-js sends uploads as a form with the file under ""). */
function parseMultipart(body: Uint8Array, contentType: string): { type: string; bytes: Uint8Array } | null {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
  if (!m) return null;
  const boundary = new TextEncoder().encode('--' + (m[1] ?? m[2]));
  const find = (needle: Uint8Array, from: number) => {
    outer: for (let i = from; i <= body.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++) if (body[i + j] !== needle[j]) continue outer;
      return i;
    }
    return -1;
  };
  const CRLF2 = new Uint8Array([13, 10, 13, 10]);
  let at = find(boundary, 0);
  while (at >= 0) {
    const headEnd = find(CRLF2, at);
    const next = find(boundary, at + boundary.length);
    if (headEnd < 0 || next < 0) break;
    const head = new TextDecoder().decode(body.slice(at, headEnd));
    if (/filename=/i.test(head) || /name=""/.test(head)) {
      const type = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1]?.trim() ?? 'application/octet-stream';
      return { type, bytes: body.slice(headEnd + 4, next - 2) };
    }
    at = next;
  }
  return null;
}
