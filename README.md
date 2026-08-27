# KLUK — Ich bin so klug

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
      "id": "khuhfp",
      "title": "…",
      "author": "…",
      "edition": "…",
      "parts": [{ "number": 1, "title": "Grundlagen" }],
      "chapters": [{ "number": 1, "title": "…", "part": 1, "file": "khuhfp-ch01.json" }]
    }
  ]
}
```

### `chapters/<file>.json`
One file per chapter, containing an array of cards:

```json
{
  "book": "khuhfp",
  "chapter": 1,
  "title": "Psychiatrie und Psychotherapie",
  "part": 1,
  "cards": [
    {
      "id": "khuhfp-01-001",
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
Place image files referenced by chapter cards in `images/` at the repo root, e.g. `images/KHuHfP.Buch.Abb.1.9.jpg`. The same image file may be referenced by multiple cards.

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

## Deployment (Netlify)

1. Push this repository to GitHub.
2. In Netlify: **Add new site → Import an existing project**, and pick the repo.
3. Build settings: none needed — this is a static site.
   - Build command: *(leave empty)*
   - Publish directory: `/`
4. Deploy.
5. To use the `kluk.michels.world` subdomain:
   - In Netlify: **Site settings → Domain management → Add a domain** → enter `kluk.michels.world`.
   - In your DNS provider for `michels.world`, add a `CNAME` record:
     - Host: `kluk`
     - Value: `<your-site-name>.netlify.app`
   - Netlify provisions an HTTPS certificate automatically once DNS is verified.

## Favicon

`index.html` already references these files at the repo root (add them yourself — they aren't included):

- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180×180, used for "Add to Home Screen" on iOS)

## Browser support

Works in all modern browsers (Chrome, Safari, Firefox, Edge). Requires `fetch()` and CSS 3D transforms (for the card flip animation), both widely supported.

## Changelog

### 0.1.0 — 2026-08-27 — Initial release
- Book and chapter selection (next chapter / all / by part / individual chapters)
- Learning sessions with configurable size (default 10), three-level weighted mastery system
- Three-way card rating (kann ich nicht / später / weiß ich), "später" cards requeue within the same session
- Two-stage answer reveal (detailed answer, then optional extra) plus optional images
- Fragenkatalog with search and part filter
- Achievements screen with stats and six animal-emoji badges
- Export / import / reset of learning progress
- Chapter 1 ("Psychiatrie und Psychotherapie") of *Kurzlehrbuch Heilpraktiker und Heilpraktikerin für Psychotherapie* (Sonja Streiber, 6. Auflage) included with 46 cards
