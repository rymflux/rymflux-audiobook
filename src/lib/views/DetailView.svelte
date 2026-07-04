<script lang="ts">
	import { CoverImage, TimeDisplay } from '@rymflux/shell';
	import type { CatalogDetail } from '@rymflux/shell';

	let {
		book = null as CatalogDetail | null,
		savedProgress = 0,
		onPlay,
		onAddToLibrary,
		onRemoveFromLibrary,
		adding = false,
		removing = false,
		isInLibrary = false,
		hideAddButton = false,
		hideChapters = false
	}: {
		book?: CatalogDetail | null;
		savedProgress?: number;
		onPlay?: (chapterIndex?: number) => void;
		onAddToLibrary?: () => void;
		onRemoveFromLibrary?: () => void;
		adding?: boolean;
		removing?: boolean;
		isInLibrary?: boolean;
		hideAddButton?: boolean;
		hideChapters?: boolean;
	} = $props();
</script>

{#if book}
	<div class="flex flex-col md:flex-row gap-6 mb-8">
		<div class="w-full md:w-48 shrink-0">
			<div class="aspect-[3/4] rounded-xl overflow-hidden bg-white/5">
				<CoverImage
					url={book.item.cover_url}
					title={book.item.title}
					class="w-full h-full object-cover"
				/>
			</div>
		</div>
		<div class="flex-1 min-w-0">
			<h1 class="text-2xl font-bold">{book.item.title}</h1>
			<p class="text-gray-400 mt-1">{book.item.author}</p>
			<p class="text-sm text-gray-500 mt-2 line-clamp-3">{book.item.description}</p>

			<div class="flex gap-3 mt-4">
				<button
					onclick={() => onPlay?.()}
					class="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
				>
					Play from start
				</button>
				{#if !hideAddButton}
					{#if isInLibrary}
						<button
							onclick={() => onRemoveFromLibrary?.()}
							disabled={removing}
							class="px-4 py-2 bg-red-700/50 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
						>
							{removing ? 'Removing…' : 'Remove from library'}
						</button>
					{:else}
						<button
							onclick={() => onAddToLibrary?.()}
							disabled={adding}
							class="px-4 py-2 bg-green-700/50 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
						>
							{adding ? 'Adding…' : 'Add to library'}
						</button>
					{/if}
				{/if}
			</div>

			{#if savedProgress > 0}
				<div class="mt-3 space-y-1">
					<p class="text-xs text-gray-500">
						Progress: {Math.round(
							(savedProgress / ((book.item.total_time_secs ?? 1) * 1000)) * 100
						)}%
					</p>
					<div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
						<div
							class="h-full bg-blue-500 rounded-full transition-all"
							style="width: {Math.min(
								(savedProgress / ((book.item.total_time_secs ?? 1) * 1000)) * 100,
								100
							)}%"
						></div>
					</div>
					<button onclick={() => onPlay?.()} class="text-xs text-blue-400 hover:underline">
						Resume
					</button>
				</div>
			{/if}

			<!-- Metadata -->
			<div class="mt-4 space-y-1 text-xs text-gray-500">
				{#if book.item.language}
					<p>Language: {book.item.language}</p>
				{/if}
				{#if book.item.num_sections != null}
					<p>Chapters: {book.item.num_sections}</p>
				{/if}
				{#if book.item.total_time_secs != null}
					<p>Duration: <TimeDisplay seconds={book.item.total_time_secs} /></p>
				{/if}
				{#if book.item.url_librivox}
					<button
						onclick={() =>
							window.open(book.item.url_librivox ?? undefined, '_blank', 'noopener noreferrer')}
						class="text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0"
					>
						View on LibriVox
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Chapters -->
	{#if !hideChapters && book.sections.length > 0}
		<section>
			<h2 class="text-lg font-semibold mb-3">Chapters</h2>
			<div class="space-y-1">
				{#each book.sections as chapter, i (chapter.id)}
					<button
						onclick={() => onPlay?.(i)}
						class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
					>
						<span
							class="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium shrink-0"
						>
							{i + 1}
						</span>
						<div class="flex-1 min-w-0">
							<p class="text-sm truncate">{chapter.title || `Chapter ${i + 1}`}</p>
						</div>
						{#if chapter.playtime_secs != null}
							<span class="text-xs text-gray-500 shrink-0"
								><TimeDisplay seconds={chapter.playtime_secs} /></span
							>
						{/if}
					</button>
				{/each}
			</div>
		</section>
	{/if}
{:else}
	<div class="text-center py-12">
		<p class="text-gray-500">Loading book details...</p>
	</div>
{/if}
