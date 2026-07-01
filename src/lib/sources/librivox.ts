// ── API response types (mirrors librivox.rs serde types) ─────────────────────

export interface LibrivoxBook {
	id: string;
	title: string;
	description: string;
	url_text_source?: string | null;
	language?: string | null;
	copyright_year?: string | null;
	num_sections?: string | null;
	url_zip_file?: string | null;
	url_librivox?: string | null;
	totaltime?: string | null;
	totaltimesecs?: number | null;
	authors: LibrivoxAuthor[];
	sections?: LibrivoxSection[] | null;
	coverart_thumbnail?: string | null;
	coverart_jpg?: string | null;
}

export interface LibrivoxAuthor {
	id: string;
	first_name: string;
	last_name: string;
}

export interface LibrivoxSection {
	id: string;
	section_number: string;
	title: string;
	listen_url: string;
	playtime?: string | null;
	language?: string | null;
	readers: LibrivoxReader[];
}

export interface LibrivoxReader {
	reader_id: string;
	display_name: string;
}

// ── Internal helpers ────────────────────────────────────────────────────────

const BASE_URL = 'https://librivox.org/api/feed/audiobooks';

/** Retry an operation with exponential backoff (500ms, 1s, give up). */
async function retryOp<T>(fn: () => Promise<T>): Promise<T> {
	let lastErr: unknown;
	for (let attempt = 0; attempt <= 2; attempt++) {
		try {
			return await fn();
		} catch (e) {
			lastErr = e;
			if (attempt < 2) {
				await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
			}
		}
	}
	throw lastErr;
}

/** Cached invoke function from Tauri IPC (avoids re-importing on every call). */
let _invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | undefined;
async function getInvoke() {
	if (!_invoke) _invoke = (await import('@tauri-apps/api/core')).invoke;
	return _invoke!;
}

/** Fetch JSON via the Tauri HTTP proxy (avoids browser CORS restrictions). */
async function fetchJson<T>(url: string, params?: Record<string, string>): Promise<T> {
	const invoke = await getInvoke();
	const urlObj = new URL(url);
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			urlObj.searchParams.set(k, v);
		}
	}
	const text = await invoke<string>('http_get', { url: urlObj.toString() });
	return JSON.parse(text) as T;
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Search by title (uses `^` prefix for anchored search). */
export async function searchByTitle(
	query: string,
	limit = 20,
	offset = 0,
): Promise<LibrivoxBook[]> {
	return retryOp(async () => {
		const data = await fetchJson<{ books: LibrivoxBook[] }>(BASE_URL, {
			title: `^${query}`,
			format: 'json',
			limit: String(limit),
			offset: String(offset),
			coverart: '1',
		});
		return data.books ?? [];
	});
}

/** Search by author last name. */
export async function searchByAuthor(
	author: string,
	limit = 20,
	offset = 0,
): Promise<LibrivoxBook[]> {
	return retryOp(async () => {
		const data = await fetchJson<{ books: LibrivoxBook[] }>(BASE_URL, {
			author,
			format: 'json',
			limit: String(limit),
			offset: String(offset),
			coverart: '1',
		});
		return data.books ?? [];
	});
}

/** Get a single book by its LibriVox ID with extended info (sections). */
export async function getBook(id: string): Promise<LibrivoxBook> {
	const url = `${BASE_URL}/id/${id}`;
	return retryOp(async () => {
		const data = await fetchJson<{ books: LibrivoxBook[] }>(url, {
			extended: '1',
			format: 'json',
		});
		const book = data.books?.[0];
		if (!book) throw new Error('no book found in response');
		return book;
	});
}

/** Get the streaming URL for a chapter/section. */
export function getStreamUrl(section: LibrivoxSection): string {
	return section.listen_url;
}

/** Get the author name from a list of authors (first author's full name). */
function getAuthorName(authors: LibrivoxAuthor[]): string {
	return authors
		.map((a) => `${a.first_name} ${a.last_name}`.trim())
		.filter(Boolean)
		.join(', ');
}

// ── Conversion helpers ──────────────────────────────────────────────────────

/** Convert a LibrivoxBook to a DomainItem for search results / library display. */
export function bookToDomainItem(
	book: LibrivoxBook,
	domainId: string,
	addedAt: string,
): import('@rymflux/shell').DomainItem {
	return {
		content_id: `librivox_${book.id}`,
		domain_id: domainId,
		title: book.title,
		author: getAuthorName(book.authors),
		source_uri: book.url_librivox ?? '',
		description: book.description,
		duration_ms: book.totaltimesecs != null ? book.totaltimesecs * 1000 : null,
		cover_url: book.coverart_jpg ?? null,
		added_at: addedAt,
		language: book.language ?? null,
		num_sections: book.num_sections != null ? Number(book.num_sections) : null,
	};
}

/** Convert a LibrivoxBook to a CatalogDetail for the DetailView component. */
export function bookToCatalogDetail(book: LibrivoxBook): import('@rymflux/shell').CatalogDetail {
	const author = getAuthorName(book.authors);
	const numSections = book.num_sections != null ? Number(book.num_sections) : null;
	return {
		item: {
			id: book.id,
			title: book.title,
			author,
			description: book.description,
			total_time_secs: book.totaltimesecs,
			num_sections: numSections,
			cover_url: book.coverart_jpg ?? null,
			language: book.language ?? null,
			url_librivox: book.url_librivox ?? null,
		},
		sections:
			book.sections?.map((s) => ({
				id: s.id,
				section_number: Number(s.section_number),
				title: s.title,
				listen_url: s.listen_url,
				playtime_secs: s.playtime != null ? Number(s.playtime) : null,
			})) ?? [],
	};
}

/** Convert a LibrivoxBook to a ContentItem for library storage. */
export function bookToContentItem(
	book: LibrivoxBook,
	domainId: string,
): import('@rymflux/shell').ContentItem {
	const author = getAuthorName(book.authors);
	return {
		id: `librivox_${book.id}`,
		domain_id: domainId,
		source_uri: book.url_librivox ?? '',
		metadata_json: {
			title: book.title,
			author,
			description: book.description,
			language: book.language,
			librivox_id: book.id,
			total_time_secs: book.totaltimesecs,
			num_sections: book.num_sections,
			cover_url: book.coverart_jpg ?? null,
		},
		content_hash: '',
		added_at: Math.floor(Date.now() / 1000),
	};
}
