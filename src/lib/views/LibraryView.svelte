<script lang="ts">
	import { CoverImage } from '@rymflux/shell';
	import type { DomainItem } from '@rymflux/shell';

	let {
		items = [],
		onSelect,
		loading = false,
		progressMap = new Map<string, number>(),
	}: {
		items: DomainItem[];
		onSelect?: (item: DomainItem) => void;
		loading?: boolean;
		progressMap?: Map<string, number>;
	} = $props();

	let viewMode = $state<'grid' | 'list'>('grid');
	let searchQuery = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let sortField = $state<'title' | 'author' | 'duration_ms' | 'added_at'>('title');
	let sortDir = $state<'asc' | 'desc'>('asc');

	let filtered = $derived(
		searchQuery
			? items.filter(
					(i) =>
						i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						i.author?.toLowerCase().includes(searchQuery.toLowerCase()),
				)
			: items,
	);

	let sorted = $derived(
		[...filtered].sort((a, b) => {
			let cmp = 0;
			switch (sortField) {
				case 'title':
					cmp = (a.title || '').localeCompare(b.title || '');
					break;
				case 'author':
					cmp = (a.author || '').localeCompare(b.author || '');
					break;
				case 'duration_ms':
					cmp = (a.duration_ms ?? 0) - (b.duration_ms ?? 0);
					break;
				case 'added_at':
					cmp = (a.added_at || '').localeCompare(b.added_at || '');
					break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		}),
	);

	function handleSearchInput(e: Event) {
		const el = e.target as HTMLInputElement;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			searchQuery = el.value;
		}, 300);
	}

	function handleSort(field: typeof sortField) {
		if (sortField === field) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDir = 'asc';
		}
	}

	function formatDate(iso: string): string {
		if (!iso) return '—';
		try {
			return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return '—';
		}
	}

	function sortArrow(field: typeof sortField): string {
		return sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
	}

	function itemProgress(item: DomainItem): number {
		const pos = progressMap.get(item.content_id) ?? 0;
		if (!item.duration_ms || item.duration_ms <= 0) return 0;
		return Math.min(pos / item.duration_ms, 1);
	}

	function isComplete(item: DomainItem): boolean {
		return item.duration_ms != null && item.duration_ms > 0 && itemProgress(item) >= 1;
	}
</script>

<div class="space-y-4">
	<!-- Toolbar: search + view toggle -->
	<div class="flex items-center gap-3">
		<div class="relative flex-1 max-w-sm">
			<input
				type="search"
				placeholder="Search in library…"
				oninput={handleSearchInput}
				class="w-full px-3 py-2 pl-9 rounded-lg bg-white/10 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
			/>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
			>
				<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
			</svg>
		</div>
		<div class="flex rounded-lg border border-white/10 overflow-hidden">
			<button
				onclick={() => (viewMode = 'grid')}
				class="p-2 {viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-400 hover:text-white'} transition-colors"
				aria-label="Grid view"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
					<path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
				</svg>
			</button>
			<button
				onclick={() => (viewMode = 'list')}
				class="p-2 {viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-400 hover:text-white'} transition-colors"
				aria-label="List view"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
					<path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Content -->
	{#if loading}
		<div class="flex justify-center py-12">
			<div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if filtered.length === 0}
		<div class="text-center py-12">
			<p class="text-gray-400">
				{searchQuery ? 'No results matching your search.' : 'Your library is empty.'}
			</p>
			{#if !searchQuery}
				<p class="text-gray-500 text-sm mt-1">Browse the LibriVox catalog to add audiobooks.</p>
	<a
				href="/search"
				class="inline-block mt-4 px-5 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
			>
					Browse Catalog
				</a>
			{/if}
		</div>
	{:else if viewMode === 'grid'}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
			{#each filtered as item (item.content_id)}
				<button
					onclick={() => onSelect?.(item)}
					class="group text-left relative"
				>
					<div class="aspect-square rounded-xl overflow-hidden bg-white/5 mb-2 relative">
						<CoverImage url={item.cover_url} title={item.title} class="w-full h-full object-cover" />
						<!-- Progress indicator -->
						{#if itemProgress(item) > 0}
							<div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
								<div
									class="h-full bg-blue-500 transition-all"
									style="width: {itemProgress(item) * 100}%"
								></div>
							</div>
						{/if}
						<!-- Completion badge -->
						{#if isComplete(item)}
							<div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-4 h-4">
									<polygon points="20,6 9,17 4,12 5.5,10.5 9,14 18.5,4.5" />
								</svg>
							</div>
						{/if}
					</div>
					<h3 class="text-sm font-medium truncate group-hover:text-blue-400 transition-colors">
						{item.title || 'Untitled'}
					</h3>
					<p class="text-xs text-gray-500 truncate">{item.author || 'Unknown'}</p>
				</button>
			{/each}
		</div>
	{:else}
		<div class="bg-white/5 rounded-xl overflow-hidden">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
						<th class="w-12 px-2 py-3"></th>
						<th
							onclick={() => handleSort('title')}
							class="text-left px-2 py-3 font-medium cursor-pointer hover:text-white select-none"
						>Title{sortArrow('title')}</th>
						<th
							onclick={() => handleSort('author')}
							class="text-left px-2 py-3 font-medium cursor-pointer hover:text-white select-none hidden sm:table-cell"
						>Author{sortArrow('author')}</th>
						<th
							onclick={() => handleSort('duration_ms')}
							class="text-right px-2 py-3 font-medium cursor-pointer hover:text-white select-none hidden md:table-cell"
						>Duration{sortArrow('duration_ms')}</th>
						<th
							onclick={() => handleSort('added_at')}
							class="text-right px-2 py-3 font-medium cursor-pointer hover:text-white select-none hidden lg:table-cell"
						>Added{sortArrow('added_at')}</th>
						<th class="w-32 px-2 py-3 hidden md:table-cell"></th>
					</tr>
				</thead>
				<tbody>
					{#each sorted as item (item.content_id)}
						<tr
							onclick={() => onSelect?.(item)}
							class="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
						>
							<td class="px-2 py-2">
								<div class="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
									<CoverImage url={item.cover_url} title={item.title} class="w-full h-full object-cover" />
								</div>
							</td>
							<td class="px-2 py-3">
								<div class="font-medium truncate max-w-40">{item.title || 'Untitled'}</div>
								{#if itemProgress(item) > 0}
									<div class="mt-1 w-full h-1 bg-white/10 rounded-full overflow-hidden max-w-32">
										<div
											class="h-full bg-blue-500 rounded-full transition-all"
											style="width: {itemProgress(item) * 100}%"
										></div>
									</div>
								{/if}
							</td>
							<td class="px-2 py-3 text-gray-400 truncate max-w-24 hidden sm:table-cell">{item.author || 'Unknown'}</td>
							<td class="px-2 py-3 text-gray-500 text-right hidden md:table-cell whitespace-nowrap">
								{item.duration_ms != null ? `${Math.floor(item.duration_ms / 60000)} min` : '—'}
							</td>
							<td class="px-2 py-3 text-gray-500 text-right hidden lg:table-cell whitespace-nowrap">
								{formatDate(item.added_at)}
							</td>
							<td class="px-2 py-3 text-right hidden md:table-cell">
								{#if isComplete(item)}
									<span class="text-xs text-green-400">Completed</span>
								{:else if itemProgress(item) > 0}
									<span class="text-xs text-blue-400">{Math.round(itemProgress(item) * 100)}%</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
