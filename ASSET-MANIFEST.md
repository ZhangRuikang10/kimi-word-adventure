# Asset Manifest Policy

## Runtime ownership

All runtime assets are served from this project under `/assets/`. The project never imports or requests files using a path into the sibling English Adventure source project.

## Course reuse

`config/course-assets.allowlist.json` is the sole source of truth for course asset copying. `scripts/sync-course-assets.mjs` validates every source against that allow-list, copies it to `public/assets/course/`, and reports missing sources. The source root can be supplied only to the build-time script; it is not recorded in runtime content URLs.

## New visual pipeline

The visual manifest supports three roles:

- `core`: one primary vocabulary image for Learn, Word to Picture, Audio to Picture, and My Words.
- `variant`: alternate recognition images for transfer practice.
- `scene`: future contextual scene images.

Phase A adds 49 approved Word Adventure core assets under `public/assets/word-core/`, covering the default-enabled non-number vocabulary concepts. Each generated core image is a 1024x1024 PNG and is project-local.

`greeting-hello` and `greeting-hi` are marked `lowVisualDiscriminability` because their real-world meaning is naturally close. Later learning flows should not rely on artificial image differences for these two concepts; audio, word-form, phrase, and context tasks should carry the distinction.

The provided generation manifest still defines 60 planned variant assets: 24 action, 8 people/feeling, and 28 object/colour variants. The catalog references future new assets as unapproved placeholders; they cannot enter question selection until an approved asset file is present. Multi-concept object/colour images retain both concept tags. `orange-fruit` visuals are marked to avoid use as an early `colour-orange` distractor.

## Formal audio freeze

All 126 formal MP3 assets are local to `public/assets/audio/` and approved for production use: 69 words, 30 phrases, and 27 sentences. The audio manifest preserves whether an asset was reused (59) or newly generated (67), while all runtime learning paths select only manifest-approved MP3 files. Browser system TTS is not used in the child learning flow.

## Audit rules

- asset IDs are unique;
- each approved manifest `src` is project-local and begins `/assets/`;
- approved Word Adventure core assets total 49;
- approved Word Adventure core PNG files must exist and be 1024x1024;
- planned Word Adventure variant assets total 60;
- visual roles are explicitly separated as `core`, `variant`, and `scene`;
- no asset with `approved: false` is selectable;
- the sync allow-list contains only approved course-reuse assets.
