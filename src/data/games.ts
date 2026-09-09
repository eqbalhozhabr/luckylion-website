// The Games page's catalog — this is the "template" the Games page brief
// asked for. To add/edit a game later, just add/edit an entry here; nothing
// in src/pages/games.astro needs to change for a new title, since that page
// only ever maps over this array.
//
// CURRENT STATE: placeholder phase. Real box renders, component photos,
// descriptions, and store/platform links are still missing for most games
// (see the note at the top of games.astro for exactly what's pending per
// game) — until they're filled in below, the page falls back to plain
// colored shapes and shows disabled buttons instead of broken links.

export type GameStatus = 'buy' | 'outofstock' | 'comingsoon';

export interface GameComponentShape {
	shape: 'circle' | 'square';
	size: number; // rem
	x: number; // % offset from the stage's center — negative = left
	y: number; // % offset from the stage's center — negative = up
	rotate?: number; // deg
	color: string;
	/** Real component photo/render (transparent background) — once supplied, games.astro shows this image instead of the flat colored placeholder shape. `shape`/`color` are then only used as a fallback if the image fails to load. */
	image?: string;
	/** Renders this piece BEHIND the box (peeking out from its edges) instead of in front of it — see the z-index comment in games.astro. */
	behind?: boolean;
	/**
	 * Travel-speed multiplier for the entrance sweep, relative to the box
	 * (1 = same pace as the box). Keep every value out of the ~0.85–1.3
	 * band so nothing ever reads as "moving in lockstep with the box" —
	 * roughly 0.55–0.8 (a bit slower/lagging behind) reads well. This is
	 * independent of `near` below — blurred pieces move at the same kind of
	 * pace as everything else, they're just visually closer/out of focus.
	 */
	speed: number;
	/** Marks this piece as "closer to the camera" — games.astro gives it a soft lens-blur (shallow depth of field) instead of full focus. Purely a look, doesn't affect its speed (see `speed` above). */
	near?: boolean;
}

export interface Game {
	slug: string;
	title: string;
	/**
	 * Real logo wordmark image — once supplied, games.astro shows this
	 * instead of rendering `title` as text (titleAccent below becomes
	 * irrelevant at that point, since the logo image already bakes in its
	 * own typography). `title` is still required — it's used for the
	 * logo's alt text, the section's aria-label, and everywhere else a
	 * plain string is needed (page metadata, etc).
	 */
	logo?: string;
	/**
	 * Trailing portion of `title` (must match the end of the string exactly)
	 * to render in the site's handwriting font instead of the title font —
	 * an explicit per-game exception (this page otherwise never uses that
	 * font). Only matters when `logo` is unset. Leave unset for every other game.
	 */
	titleAccent?: string;
	/** Paragraphs separated by a blank line (\n\n); a single \n within a paragraph becomes a line break. */
	summary: string;
	mechanics?: string[];
	status: GameStatus;
	buyUrl?: string;
	/** Overrides the disabled status pill with an actual clickable link — any label works (e.g. "Follow on Gamefound", or "Play Now" linking to an online-play platform when there's no real store yet) — needs both fields set. Only used when status isn't 'buy'. */
	comingSoonLabel?: string;
	comingSoonUrl?: string;
	bggUrl?: string;
	bgaUrl?: string; // BoardGameArena
	tabletopiaUrl?: string;
	youtubeUrl?: string;
	/** Real 3D box render — once supplied, games.astro swaps the placeholder box for this image instead. */
	boxImage?: string;
	/** Two blurred color stops for this game's placeholder backdrop wash. */
	backdrop: [string, string];
	boxColor: string;
	components: GameComponentShape[];
}

export const games: Game[] = [
	{
		slug: 'the-last-shelter',
		title: 'The Last Shelter Whispers of the Mist',
		logo: '/games/thelastshelter/logo.webp',
		titleAccent: 'Whispers of the Mist',
		summary: "When a mysterious fog engulfed the Mazandaran coast, lurking monsters emerged to prey on the living. Gather resources, build the Last Shelter, and use fire to survive.",
		mechanics: ['Survival', 'Resource Management', 'Player vs Environment'],
		status: 'comingsoon',
		comingSoonLabel: 'Follow us on Gamefound',
		comingSoonUrl: 'https://gamefound.com/en/creators/eqbalh',
		bggUrl: 'https://boardgamegeek.com/boardgame/469902/the-last-shelter-whispers-of-the-mist',
		backdrop: ['#1c3b32', '#0d1613'],
		boxColor: '#3f6f5c',
		boxImage: '/games/thelastshelter/box.webp',
		components: [
			// These are the same component art already used in the homepage
			// hero (src/pages/index.astro) — reused here rather than re-rendered.
			// Same recipe as Tennidice/Cumulus: two pieces near/blurred and big,
			// two behind the box, three in front and in focus (small tokens —
			// the meeple, the small monster — sized down since they're sharp,
			// not blurred).
			{ shape: 'square', size: 6.2, x: -38, y: 32, rotate: -6, color: '#3a3a3a', speed: 0.6, near: true, image: '/games/thelastshelter/Monster_L.webp' },
			{ shape: 'square', size: 2.6, x: 38, y: -22, rotate: 8, color: '#5a5a5a', speed: 0.72, image: '/games/thelastshelter/Monster_M.webp' },
			{ shape: 'square', size: 1.7, x: -16, y: -32, rotate: -10, color: '#8a8a8a', speed: 0.78, behind: true, image: '/games/thelastshelter/Monster_S.webp' },
			{ shape: 'square', size: 4.4, x: 38, y: 28, rotate: 10, color: '#3f6f9e', speed: 0.65, image: '/games/thelastshelter/Pickup_Blue_02.webp' },
			{ shape: 'square', size: 5.6, x: 44, y: 2, rotate: -4, color: '#a3453f', speed: 0.58, near: true, image: '/games/thelastshelter/Pickup_Red.webp' },
			{ shape: 'square', size: 4.2, x: -34, y: -8, rotate: 6, color: '#3f5c3f', speed: 0.7, image: '/games/thelastshelter/TrapTiles_02_RGB.webp' },
			{ shape: 'square', size: 1.6, x: 16, y: 34, rotate: 12, color: '#4a7fb5', speed: 0.75, behind: true, image: '/games/thelastshelter/Meeple_01.webp' },
		],
	},
	{
		slug: 'tennidice',
		title: 'Tennidice',
		logo: '/games/tennidice/logo.webp',
		summary: "Who is the luckiest tennis player in the world?\nTennidice is a 2-or-4-player game that simulates an actual tennis match. Instead of using rackets, you roll dice — and use strategy cubes to strengthen your abilities to win, but sometimes a lucky opponent won't let you succeed!",
		mechanics: ['Dice Rolling', 'Head-to-Head', 'Push Your Luck'],
		status: 'comingsoon',
		comingSoonLabel: 'Play Now',
		comingSoonUrl: 'https://tabletopia.com/games/tennidice',
		bggUrl: 'https://boardgamegeek.com/boardgame/360149/tennidice',
		tabletopiaUrl: 'https://tabletopia.com/games/tennidice',
		youtubeUrl: 'https://youtu.be/EJatPHHf0x4',
		backdrop: ['#274a63', '#0f1a22'],
		boxColor: '#3f7a9e',
		boxImage: '/games/tennidice/box.webp',
		components: [
			// Two pieces sit closer to camera (near: true → blurred, bigger) —
			// the ABC die (right side) and the OUT tile (bottom-left, the
			// biggest piece here). Two sit BEHIND the box, peeking out from its
			// top/bottom corners. The rest float in front, in focus.
			{ shape: 'square', size: 5.2, x: 44, y: 6, rotate: 4, color: '#eef1ee', speed: 0.62, near: true, image: '/games/tennidice/component-1.webp' }, // ABC die — moved to the right side per feedback
			{ shape: 'square', size: 3.1, x: -30, y: -28, rotate: -8, color: '#eef1ee', speed: 0.75, image: '/games/tennidice/component-2.webp' }, // 123 die
			{ shape: 'square', size: 3.1, x: 36, y: 30, rotate: 12, color: '#3fae6f', speed: 0.68, image: '/games/tennidice/component-3.webp' }, // racket/ball die
			{ shape: 'square', size: 2.4, x: -16, y: -32, rotate: -15, color: '#3fae6f', speed: 0.7, behind: true, image: '/games/tennidice/component-4.webp' }, // FA die (behind)
			{ shape: 'square', size: 2.4, x: 18, y: 34, rotate: 10, color: '#3fae6f', speed: 0.6, behind: true, image: '/games/tennidice/component-5.webp' }, // 125 die (behind)
			{ shape: 'square', size: 4.6, x: 38, y: -24, rotate: 6, color: '#9fc4b8', speed: 0.78, image: '/games/tennidice/component-6.webp' }, // IN tile — bigger per feedback
			{ shape: 'square', size: 7.2, x: -38, y: 34, rotate: -6, color: '#8fa4b8', speed: 0.58, near: true, image: '/games/tennidice/component-7.webp' }, // OUT tile — bigger again per feedback
			{ shape: 'square', size: 1.9, x: 20, y: -46, rotate: 10, color: '#eef1ee', speed: 0.72, image: '/games/tennidice/component-2.webp' }, // small copy of the 123 die, peeking above the box
		],
	},
	{
		slug: 'anti-enzyme',
		title: 'Anti-Enzyme',
		logo: '/games/anti-enzyme/logo.webp',
		summary: "Inside every washing machine, a microscopic war is raging. You are a living stain fighting for control over every thread of fabric!\n\nCompete against rival stains while resisting detergent and the spin cycle. Expand your influence, play tactical Enzyme cards, and brace yourself when the dice roll for the Washing Machine Phase.\n\nDominate the clothes, survive the wash, and prove you're permanent!",
		mechanics: ['Card Play', 'Dice Rolling', 'Player vs Player'],
		status: 'comingsoon',
		bggUrl: 'https://boardgamegeek.com/boardgame/335112/anti-enzyme',
		youtubeUrl: 'https://youtu.be/4PpCmmK6ze4',
		backdrop: ['#4a2740', '#180f1a'],
		boxColor: '#8a4f8e',
		boxImage: '/games/anti-enzyme/box.webp',
		components: [
			// Only 5 pieces here (this game just has fewer components than the
			// others) — same recipe scaled down: two enzyme cards near/blurred
			// and big, one card behind the box, two in front and in focus.
			{ shape: 'square', size: 5, x: -32, y: -28, rotate: -8, color: '#a8c98a', speed: 0.7, image: '/games/anti-enzyme/component-1.webp' }, // Lipase card — bigger per feedback
			{ shape: 'square', size: 7, x: -38, y: 32, rotate: -6, color: '#e8987a', speed: 0.6, near: true, image: '/games/anti-enzyme/component-2.webp' }, // Protease card, big/blurred — bigger per feedback
			{ shape: 'square', size: 3, x: 16, y: -32, rotate: 10, color: '#b48ac9', speed: 0.75, behind: true, image: '/games/anti-enzyme/component-3.webp' }, // Amylase card (behind) — bigger per feedback
			{ shape: 'square', size: 5.2, x: 38, y: 26, rotate: 8, color: '#1a1a1a', speed: 0.65, image: '/games/anti-enzyme/component-4.webp' }, // black Anti-Enzyme card — bigger per feedback
			{ shape: 'square', size: 6.8, x: 44, y: 4, rotate: 45, color: '#a8c9e0', speed: 0.58, near: true, image: '/games/anti-enzyme/component-5.webp' }, // Enzyme Five card (blue), big/blurred — rotated 45° clockwise per feedback
		],
	},
	{
		slug: 'cumulus',
		title: 'Cumulus',
		logo: '/games/cumulus/logo.webp',
		summary: "A blue sky, without a single cloud, over the sea. Gradually, the gentle breeze turns to wind — it's time for the race. A marathon between two cumulus clouds is about to start! The cloud group that gathers the most points by the end of the path wins!",
		mechanics: ['Racing', 'Area Majority'],
		status: 'comingsoon',
		youtubeUrl: 'https://youtu.be/GURg7ogaO-Y',
		backdrop: ['#2c4a63', '#101a22'],
		boxColor: '#5c92c6',
		boxImage: '/games/cumulus/box.webp',
		components: [
			// Same recipe as Tennidice: two hex-map cards in focus, one card
			// peeking from behind the box, two cloud tokens (one black, one
			// white) blurred and bigger up close, two smaller cloud tokens
			// peeking from behind.
			{ shape: 'square', size: 4.2, x: -32, y: -30, rotate: -8, color: '#9aa3a8', speed: 0.72, image: '/games/cumulus/component-1.webp' }, // grey hex card — bigger per feedback
			{ shape: 'square', size: 3.4, x: 14, y: -32, rotate: 12, color: '#bcd9ef', speed: 0.65, behind: true, image: '/games/cumulus/component-2.webp' }, // blue hex card (behind) — bigger per feedback
			{ shape: 'square', size: 4.4, x: 36, y: 28, rotate: 10, color: '#e9d9a0', speed: 0.6, image: '/games/cumulus/component-3.webp' }, // tan hex card — bigger per feedback
			{ shape: 'square', size: 6.5, x: -38, y: 32, rotate: -6, color: '#2b2b2b', speed: 0.58, near: true, image: '/games/cumulus/component-4.webp' }, // black cloud token, big/blurred
			{ shape: 'square', size: 1.6, x: -18, y: -34, rotate: -10, color: '#2b2b2b', speed: 0.75, behind: true, image: '/games/cumulus/component-5.webp' }, // black cloud token (behind) — smaller per feedback (not blurred)
			{ shape: 'square', size: 2.4, x: 40, y: -22, rotate: 8, color: '#f2f5f4', speed: 0.68, image: '/games/cumulus/component-6.webp' }, // white cloud token — smaller per feedback (not blurred)
			{ shape: 'square', size: 4.6, x: 44, y: 8, rotate: -4, color: '#f2f5f4', speed: 0.62, near: true, image: '/games/cumulus/component-7.webp' }, // white cloud token, big/blurred
		],
	},
];
