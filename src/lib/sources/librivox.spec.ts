import { describe, it, expect } from 'vitest';
import { bookToDomainItem, bookToCatalogDetail, bookToContentItem, getStreamUrl } from './librivox';
import type { LibrivoxBook } from './librivox';

function makeMockBook(overrides: Partial<LibrivoxBook> = {}): LibrivoxBook {
	return {
		id: '12345',
		title: 'The Adventures of Sherlock Holmes',
		description: 'A collection of twelve short stories.',
		authors: [{ id: '1', first_name: 'Arthur', last_name: 'Conan Doyle' }],
		sections: [
			{
				id: 'sec_1',
				section_number: '1',
				title: 'A Scandal in Bohemia',
				listen_url: 'https://www.librivox.org/abc/123.mp3',
				playtime: '1800',
				language: 'English',
				readers: [{ reader_id: 'r1', display_name: 'Reader One' }]
			}
		],
		language: 'English',
		copyright_year: '2020',
		num_sections: '1',
		url_zip_file: 'https://archive.org/zip/123',
		url_librivox: 'https://librivox.org/123',
		totaltime: '30:00',
		totaltimesecs: 1800,
		coverart_thumbnail: 'https://archive.org/thumb/123',
		coverart_jpg: 'https://archive.org/covers/123.jpg',
		url_text_source: null,
		...overrides
	};
}

describe('librivox adapter — conversion helpers', () => {
	it('bookToDomainItem converts a book to a DomainItem', () => {
		const book = makeMockBook();
		const item = bookToDomainItem(book, 'librivox', '2026-07-04T00:00:00Z');

		expect(item.content_id).toBe('librivox_12345');
		expect(item.title).toBe('The Adventures of Sherlock Holmes');
		expect(item.author).toBe('Arthur Conan Doyle');
		expect(item.domain_id).toBe('librivox');
		expect(item.duration_ms).toBe(1800 * 1000);
		expect(item.cover_url).toBe('https://archive.org/covers/123.jpg');
		expect(item.num_sections).toBe(1);
	});

	it('bookToDomainItem handles missing optional fields', () => {
		const book = makeMockBook({
			totaltimesecs: null,
			coverart_jpg: null,
			num_sections: null
		});
		const item = bookToDomainItem(book, 'librivox', '2026-07-04T00:00:00Z');

		expect(item.duration_ms).toBeNull();
		expect(item.cover_url).toBeNull();
		expect(item.num_sections).toBeNull();
	});

	it('bookToCatalogDetail converts a book with sections', () => {
		const book = makeMockBook();
		const detail = bookToCatalogDetail(book);

		expect(detail.item.id).toBe('12345');
		expect(detail.item.title).toBe('The Adventures of Sherlock Holmes');
		expect(detail.item.author).toBe('Arthur Conan Doyle');
		expect(detail.sections).toHaveLength(1);
		expect(detail.sections[0].title).toBe('A Scandal in Bohemia');
		expect(detail.sections[0].listen_url).toBe('https://www.librivox.org/abc/123.mp3');
		expect(detail.sections[0].playtime_secs).toBe(1800);
	});

	it('bookToCatalogDetail handles missing sections gracefully', () => {
		const book = makeMockBook({ sections: null });
		const detail = bookToCatalogDetail(book);

		expect(detail.item.id).toBe('12345');
		expect(detail.sections).toEqual([]);
	});

	it('bookToContentItem converts a book to a ContentItem', () => {
		const book = makeMockBook();
		const item = bookToContentItem(book, 'librivox');

		expect(item.id).toBe('librivox_12345');
		expect(item.domain_id).toBe('librivox');
		expect(item.source_uri).toBe('https://librivox.org/123');
		expect(item.metadata_json!.title).toBe('The Adventures of Sherlock Holmes');
		expect(item.metadata_json!.author).toBe('Arthur Conan Doyle');
		expect(item.metadata_json!.librivox_id).toBe('12345');
		expect(item.metadata_json!.total_time_secs).toBe(1800);
		expect(item.metadata_json!.num_sections).toBe('1');
	});

	it('getStreamUrl returns the listen_url from a section', () => {
		const book = makeMockBook();
		const section = book.sections![0];
		expect(getStreamUrl(section)).toBe('https://www.librivox.org/abc/123.mp3');
	});

	it('handles multiple authors', () => {
		const book = makeMockBook({
			authors: [
				{ id: '1', first_name: 'Arthur', last_name: 'Conan Doyle' },
				{ id: '2', first_name: 'John', last_name: 'Doe' }
			]
		});
		const item = bookToDomainItem(book, 'librivox', '2026-07-04T00:00:00Z');
		expect(item.author).toBe('Arthur Conan Doyle, John Doe');
	});
});
