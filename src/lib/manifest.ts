import type { DomainManifest, AudioSource } from '@rymflux/shell';
import LibraryView from './views/LibraryView.svelte';
import DetailView from './views/DetailView.svelte';
import NowPlayingView from './views/NowPlayingView.svelte';
import {
	searchByTitle,
	searchByAuthor,
	getBook,
	bookToDomainItem,
	bookToCatalogDetail,
	bookToContentItem
} from './sources/librivox';

const DOMAIN_ID = 'audiobook';

/** Strip the 'librivox_' prefix from a content/catalog ID. */
function stripPrefix(id: string): string {
	return id.startsWith('librivox_') ? id.slice('librivox_'.length) : id;
}

export const audiobookDomain: DomainManifest = {
	id: DOMAIN_ID,
	name: 'Audiobooks',
	icon: 'book',
	views: {
		library: LibraryView,
		detail: DetailView,
		player: NowPlayingView
	},

	async search(
		query: string,
		searchType: string,
		limit = 20,
		offset = 0
	): Promise<import('@rymflux/shell').DomainItem[]> {
		const useAuthor = searchType === 'author';
		const books = useAuthor
			? await searchByAuthor(query, limit, offset)
			: await searchByTitle(query, limit, offset);
		const addedAt = String(Math.floor(Date.now() / 1000));
		return books.map((b) => bookToDomainItem(b, DOMAIN_ID, addedAt));
	},

	async getDetail(id: string) {
		const rawId = stripPrefix(id);
		try {
			const book = await getBook(rawId);
			return bookToCatalogDetail(book);
		} catch {
			return null;
		}
	},

	resolveSource(listenUrl: string, durationMs: number): AudioSource {
		return { uri: listenUrl, duration_ms: durationMs, mime_type: 'audio/mpeg' };
	},

	async buildLibraryItem(catalogId: string) {
		const rawId = stripPrefix(catalogId);
		const book = await getBook(rawId);
		return bookToContentItem(book, DOMAIN_ID);
	}
};
