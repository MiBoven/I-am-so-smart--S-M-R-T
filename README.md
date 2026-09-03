# K-L-U-K
### Ich werd so klug – K-L-U-K
*(I'm gettin so smart – S-M-R-T)*

A privacy-friendly, fully offline flashcard learning app for studying textbook chapters, chapter by chapter. Everything runs entirely in your browser — no backend, no analytics, no data ever leaves the device (except optional manual export/import as a JSON file).

**Live at:** [kluk.michels.world](https://kluk.michels.world)

## Concept

Unlike a plain vocabulary trainer, KLUK is built around **books and their chapters**. Each book is split into parts (e.g. "Grundlagen", "Störungen und Krankheitsbilder", "Therapie") and chapters within those parts. Flashcards are nicely phrased exam-style questions rather than simple "what is X" prompts, and answers come in three layers:

1. **Simple answer** — shown immediately after flipping the card
2. **Detailed answer** — revealed via "Mehr anzeigen"
3. **Extra** — an additional detail or example, revealed via a second "Mehr anzeigen" (only shown if the card has one)

## Features

- **Book & chapter selection**: choose the next unstudied chapter, all chapters, entire parts (e.g. "Teil I – Grundlagen"), or hand-pick individual chapters
- **Learning sessions**: default 10 cards per session, adjustable in settings
- **Three rating options** per card:
  - ✕ **Kann ich nicht** — resets the card's mastery level
  - ✓ **Weiß ich** — increases the card's mastery level (3-level system: new → learning → mastered)
  - 🕓 **Später** — puts the card back at the end of the *same* session's queue without affecting its mastery level; it stays part of the session's fixed card count and will come up again before the session ends
- **Weighted card selection**: cards you don't know yet or are still learning appear more often than cards you've already mastered
- **Images**: cards can reference one or more images (stored in `images/`, referenced by filename in the chapter JSON); tapping an image opens it full-size
- **Fragenkatalog** (question catalog): searchable, filterable by book part, replaces the "dictionary" screen found in other apps of the suite
- **Achievements**: a combined stats + badge screen with animal-emoji badges that unlock as you keep learning (see below)
- **Export / Import / Reset** of all learning progress as a JSON file
- **Prepared for future languages**: all UI strings live in a single `STRINGS` object in `app.js`; only `de` (German) is filled in for now, so adding e.g. `en` later requires no structural changes
- **Prüfungsrelevanz** (`relevance` field, `!!!`/`!!`/`!`): copied over from the book's own "Lernhinweis" boxes where explicitly given; left empty where the book itself doesn't rate a topic, rather than guessing
- Dark mode by default, with a light mode toggle
- Mobile-first layout, fullscreen button
- You're warned before an accidental reload/navigation discards an unfinished session

## Achievements

| Badge | Name | Condition |
|---|---|---|
| 🦉 | Nachteule | 20 cards answered after 22:00 |
| 🐢 | Dranbleiber | 7 days in a row studied |
| 🦁 | Löwenmut | 10 previously-wrong cards later mastered |
| 🐝 | Fleißiges Bienchen | 500 cards answered in total |
| 🦊 | Kapitel-Meister | An entire chapter mastered (every card at the highest level) |
| 🐿️ | Vorratssammler | Every chapter of a book studied at least once |

## Data format

### `chapters/manifest.json`
Lists all books, their parts, and their chapters (each chapter points to its own JSON file):

```json
{
  "books": [
    {
      "id": "grundzuege-biologie",
      "title": "Grundzüge der Biologie",
      "author": "J. Wagner",
      "edition": "4. Auflage",
      "parts": [{ "number": 1, "title": "Zellbiologie" }],
      "chapters": [{ "number": 1, "title": "Der Zellaufbau", "part": 1, "file": "gzb-ch01.json" }]
    }
  ]
}
```

### `chapters/<file>.json`
One file per chapter, containing an array of cards:

```json
{
  "book": "grundzuege-biologie",
  "chapter": 1,
  "title": "Der Zellaufbau",
  "part": 1,
  "cards": [
    {
      "id": "gzb-01-001",
      "section": "1.1.1",
      "question": "…",
      "answerSimple": "…",
      "answerDetail": "…",
      "extra": "… or null",
      "relevance": "!!! or !! or ! or null",
      "images": ["Filename.jpg"]
    }
  ]
}
```

### Images
Place image files referenced by chapter cards in `images/` at the repo root, e.g. `images/GZB.Buch.Abb.1.9.jpg`. The same image file may be referenced by multiple cards.

## Adding new chapters or books

1. Add a new chapter JSON file under `chapters/`.
2. Register it in `chapters/manifest.json` (new chapter entry, or a whole new book object).
3. Add any referenced images to `images/`.

No code changes are needed for new chapters or books using the existing structure.

## Files

- `index.html` — markup and screen skeletons
- `style.css` — all styling
- `app.js` — application logic
- `chapters/` — manifest + one JSON file per chapter
- `images/` — images referenced by cards
- `data/flip-quotes.json` — one-liners shown when flipping a session card back to the question side

## Favicon

`index.html` already references these files at the repo root (add them yourself — they aren't included):

- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180×180, used for "Add to Home Screen" on iOS)

## Browser support

Works in all modern browsers (Chrome, Safari, Firefox, Edge). Requires `fetch()` and CSS 3D transforms (for the card flip animation), both widely supported.

## Changelog

### 0.2.3 — 2026-09-02 — Mastery progress bars, remember last book
- New setting "Letztes Brainfood merken (Buch, Skript usw.)" (off by default): when enabled, the app jumps straight to the last opened book's Brainfood screen on load instead of showing the welcome/book-list screens
- Clicking the book title card on the Brainfood screen now goes back to the book list, instead of doing nothing
- The book card now shows a subtle, unlabeled progress bar: green for mastered cards, red for cards seen but not yet mastered, and the remaining grey track for cards not seen at all. The bar gets a soft gold shimmer once every card in the book is mastered
- Achievements now shows a bigger version of the same bar for the current book; tapping it opens a detail popup with exact percentages, plus a "Mehr Details" toggle that reveals the same breakdown per chapter

### 0.2.2 — 2026-09-01 — Mouse flip fix, keyboard controls
- Fixed flipping a flashcard by clicking with a mouse (touch already worked): tap-to-flip and swipe-to-rate/-navigate are now handled by a single pointer-event flow instead of a separate native "click" listener next to pointer-capture-based dragging, which some desktop browsers could suppress
- Keyboard controls while a flashcard is showing: Arrow Left/Right (or A/D) rate the card during a learning session (kann ich nicht / weiß ich) or browse to the previous/next card in the Karteikartenbox's card view; Arrow Up/Down (or W/S) flip the card in both places; Space marks a session card as "später". Ignored while typing in a text field
- Karteikartenbox card view gained "first" and "last" buttons alongside the existing previous/next arrows, to jump straight to either end of the current (filtered) card list

### 0.2.1 — 2026-08-31 — Flip-back captions & abort notice
- Leaving an unfinished learning session (back arrow or hardware/browser back) now shows a toast confirming that nothing was saved, instead of leaving silently
- Flipping a session card back from the answer to the question side now shows a small teasing one-liner underneath the card (e.g. "Du schummelst doch nicht, oder? 🧐"), picked at random from `data/flip-quotes.json`; the caption clears again once you move to the next card

### 0.2.0 — 2026-08-30 — Karteikartenbox, browser back, free-form rating
- Browser/hardware back button now works like the in-app back arrow (via the History API) across every major screen transition, instead of leaving the page
- The book list now shows "Brainfood Speisekarte" as a subtitle under its title, and the per-book home screen is now titled "Brainfood" with its own subtitle ("Guten Appetit" / "Viel Erfolg und guten Appetit")
- The settings gear icon is now a solid, rounded-tooth cog (closer to a standard OS settings icon) instead of a thin outline that was hard to recognize at small sizes
- "Fragenkatalog" renamed to "Karteikartenbox"; it now offers two views — a browsable, flippable card view (default, swipe or arrow buttons to move between cards, no rating) and the previous list view — both sharing the same search and part filter. A "+" button for adding new cards is visible but disabled for now (shows a notice on tap)
- Chapter selection screen (now titled "Lerneinheit starten") lets you set the number of cards for just this one session, without changing your saved default
- A learning session can always be left via the back button; nothing is saved to your statistics unless the session is completed
- The progress bar now visibly reaches 100% before the "Lerninhalt abgeschlossen" screen appears, instead of jumping there while still showing the previous card's progress
- Fixed a bug where returning to Brainfood from the session summary, then pressing back, would land back on the (already finished) summary screen instead of the book list
- The summary screen's "Zurück zum Start" button is renamed to "Zurück zu Brainfood" (it never went to the actual start screen) and gained a "Antworten nochmal anschauen" section: an expandable list of every card from that session (green/red per card), tapping one opens it as a flippable card in a popup
- During a session, cards can now be rated at any time — before or after flipping — and can be flipped back and forth as often as you like. Swiping the card left/right now also works for "Kann ich nicht" / "Weiß ich" (not for "Später", which stays button-only)

### 0.1.2 — 2026-08-29 — Welcome screen & flatter icons
- New welcome screen as the app's actual entry point: a large hero button (book icon) leads to the book/script list, with a short explanation of what KLUK does underneath. The book list is now a screen of its own, reached after tapping the hero button, instead of being the entry point
- Header icon buttons (theme, fullscreen, settings, back) switched from a bordered/filled button look to plain, borderless icons for a flatter, more modern feel
- Back button now uses a proper arrow icon from the shared SVG icon set instead of a text glyph

### 0.1.1 — 2026-08-28 — Header, book list & favorites
- App title in the header is now written with hyphens (K-L-U-K), with a German-only subtitle underneath ("Ich werd so klug" / "Ich werd so klug, K-L-U-K" depending on available width)
- Header icons (theme toggle, fullscreen, settings) replaced with a consistent inline SVG icon set (sun/moon, gear, fullscreen on/off) instead of emoji/text glyphs
- Settings is now reachable from a persistent gear icon in the header instead of a per-book menu button
- Edition/print run is no longer shown in the book list or book home screen; it (and other book details) now lives in a new "Über das Buch" screen instead
- Books can now be marked as favorites (heart icon); favorites are pinned to the top of the book list, separated by a divider from the alphabetically sorted remaining books

### 0.1.0 — 2026-08-27 — Initial release
- Book and chapter selection (next chapter / all / by part / individual chapters)
- Learning sessions with configurable size (default 10), three-level weighted mastery system
- Three-way card rating (kann ich nicht / später / weiß ich), "später" cards requeue within the same session
- Two-stage answer reveal (detailed answer, then optional extra) plus optional images
- Fragenkatalog with search and part filter
- Achievements screen with stats and six animal-emoji badges
- Export / import / reset of learning progress
