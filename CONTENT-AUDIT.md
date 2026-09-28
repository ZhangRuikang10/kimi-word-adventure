# Content Audit

## Baseline sources

- `Kimi_Word_Adventure_word-bank-v1.csv`
- `Kimi_Word_Adventure_V1_Product_Architecture_Spec.md`

## Catalog contract

The catalog has exactly 69 concept entries: 3 greetings, 5 people/feelings, 12 classroom actions/chunks, 10 colours, 20 numbers, and 19 objects. It intentionally has 68 unique display labels because `orange` is two distinct meanings.

## Curriculum status

| Status | Count | Default daily new scheduling |
| --- | ---: | --- |
| core | 56 | enabled |
| exposure (8–10) | 3 | disabled pending teacher confirmation |
| bonus (11–20) | 10 | disabled pending teacher enablement |

Thus the default safe catalog is 56 concepts and the teacher-gated number set is 13 concepts (`number-08` through `number-20`).

## Language banks

The initial content data contains the 30 approved phrase instances and the 27 specified sentence/frame entries. References are validated against catalog concept IDs. Templates are not expanded automatically: only reviewed instances are eligible for questions.

## Intentional gaps

The data model carries `audio.word` as optional. The initial allow-list copies 34 directly matching isolated/minimal-unit MP3 files; concepts without one have audio question capabilities disabled rather than falling back to browser speech synthesis. Number visuals are generated as quantities at question time, not treated as a fixed image cue.
