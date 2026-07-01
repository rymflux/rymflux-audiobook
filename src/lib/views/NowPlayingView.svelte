<script lang="ts">
	import { SeekBar, PlaybackControls, TimeDisplay, VolumeSlider, CoverImage, getPlayerState } from '@rymflux/shell';
	import { onMount } from 'svelte';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';

	let {
		onPlayPause,
		onSeek,
		onSkipBack,
		onSkipForward,
		onSpeedChange,
		onVolumeChange,
		onChapterClick,
	}: {
		onPlayPause?: () => void;
		onSeek?: (ms: number) => void;
		onSkipBack?: () => void;
		onSkipForward?: () => void;
		onSpeedChange?: (rate: number) => void;
		onVolumeChange?: (v: number) => void;
		onChapterClick?: (chapterIndex: number) => void;
	} = $props();

	let playerState = getPlayerState();

	let sleepOption = $state<'none' | 15 | 30 | 45 | 60 | 'chapter'>('none');
	let timerHandle = $state<ReturnType<typeof setTimeout> | undefined>();

	function startSleepTimer(minutes: number) {
		sleepOption = minutes as typeof sleepOption;
		clearTimeout(timerHandle);
		timerHandle = setTimeout(() => {
			onPlayPause?.();
			sleepOption = 'none';
			timerHandle = undefined;
		}, minutes * 60 * 1000);
	}

	function startChapterSleep() {
		clearTimeout(timerHandle);
		sleepOption = 'chapter';
	}

	function cancelSleepTimer() {
		clearTimeout(timerHandle);
		timerHandle = undefined;
		sleepOption = 'none';
	}

	let cleanupFinished: UnlistenFn | undefined;

	onMount(() => {
		const setup = async () => {
			cleanupFinished = await listen<void>('audio:finished', () => {
				if (sleepOption === 'chapter') {
					onPlayPause?.();
					sleepOption = 'none';
				}
			});
		};
		setup();

		return () => {
			cleanupFinished?.();
		};
	});

	function handleSeekFraction(f: number) {
		if (!playerState.currentContentId) return;
		const target = Math.round(f * playerState.durationMs);
		onSeek?.(target);
	}

	function handleSkipBackHandler() {
		onSkipBack?.();
	}

	function handleSkipForwardHandler() {
		onSkipForward?.();
	}

	function handlePlayPauseHandler() {
		onPlayPause?.();
	}

	function handleSpeedChangeHandler(rate: number) {
		onSpeedChange?.(rate);
	}

	function handleVolumeChangeHandler(v: number) {
		onVolumeChange?.(v);
	}

	async function handleChapterClick(i: number) {
		onChapterClick?.(i);
	}
</script>

<div class="max-w-2xl mx-auto space-y-6">
	<!-- Large cover art + title -->
	<div class="text-center">
		<div class="w-48 h-48 mx-auto rounded-2xl overflow-hidden bg-white/5 mb-4">
			<CoverImage url={playerState.currentCoverUrl} title={playerState.currentTitle} class="w-full h-full object-cover" />
		</div>
		<h2 class="text-xl font-semibold truncate">{playerState.currentTitle || 'No title'}</h2>
	</div>

	<!-- Seek bar -->
	<div class="space-y-1">
		<SeekBar
			progress={playerState.progressFraction}
			onSeek={handleSeekFraction}
		/>
		<div class="flex justify-between text-xs text-gray-500">
			<TimeDisplay seconds={Math.floor(playerState.positionMs / 1000)} />
			<TimeDisplay seconds={Math.floor(playerState.remainingMs / 1000)} />
		</div>
	</div>

	<!-- Controls -->
	<div class="flex justify-center">
		<PlaybackControls
			onPlayPause={handlePlayPauseHandler}
			onSkipBack={handleSkipBackHandler}
			onSkipForward={handleSkipForwardHandler}
			onSpeedChange={handleSpeedChangeHandler}
		/>
	</div>

	<!-- Volume -->
	<div class="flex justify-center">
		<div class="w-48">
			<VolumeSlider volume={playerState.volume} onVolumeChange={handleVolumeChangeHandler} />
		</div>
	</div>

	<!-- Sleep timer -->
	<div class="flex justify-center">
		<div class="flex items-center gap-2 text-sm">
			<span class="text-gray-400">Sleep timer:</span>
			{#if sleepOption === 'none'}
				<button
					onclick={() => startSleepTimer(15)}
					class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-xs"
				>
					15m
				</button>
				<button
					onclick={() => startSleepTimer(30)}
					class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-xs"
				>
					30m
				</button>
				<button
					onclick={() => startSleepTimer(45)}
					class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-xs"
				>
					45m
				</button>
				<button
					onclick={() => startSleepTimer(60)}
					class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-xs"
				>
					60m
				</button>
				<button onclick={startChapterSleep} class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-xs">
					End of chapter
				</button>
			{:else if sleepOption === 'chapter'}
				<span class="text-blue-400 text-xs">At end of chapter</span>
				<button onclick={cancelSleepTimer} class="text-xs text-gray-500 hover:text-white underline">Cancel</button>
			{:else}
				<span class="text-blue-400 text-xs">{sleepOption} min</span>
				<button onclick={cancelSleepTimer} class="text-xs text-gray-500 hover:text-white underline">Cancel</button>
			{/if}
		</div>
	</div>

	<!-- Chapter navigation -->
	{#if playerState.currentSections.length > 0}
		<section>
			<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Chapters</h3>
			<div class="space-y-1 max-h-60 overflow-y-auto">
				{#each playerState.currentSections as ch, i (ch.id)}
					<button
						onclick={() => handleChapterClick(i)}
						class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left {i === playerState.currentChapterIndex ? 'bg-blue-600/10 border border-blue-500/30' : ''}"
					>
						<span
							class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 {i === playerState.currentChapterIndex ? 'bg-blue-600 text-white' : 'bg-white/10'}"
						>
							{i + 1}
						</span>
						<div class="flex-1 min-w-0">
							<p class="text-sm truncate">{ch.title || `Chapter ${i + 1}`}</p>
						</div>
						{#if ch.playtime_secs != null}
							<span class="text-xs text-gray-500 shrink-0"><TimeDisplay seconds={ch.playtime_secs} /></span>
						{/if}
					</button>
				{/each}
			</div>
		</section>
	{/if}
</div>
