# Kimi Word Adventure — Architecture

## Scope of phase 1

This is an independently deployable React/Vite application. The phase establishes content, learning-engine, persistence, analytics, asset-boundary and automated-test foundations. It deliberately does not implement the final child-facing UI, accounts, cloud sync, subscriptions, a shop, push notifications, or generated production assets/audio.

## Boundaries

- `content/` is immutable curriculum data and its validation rules.
- `engine/` is framework-independent TypeScript for scheduling, question creation, spaced review, mastery, and anti-pattern constraints.
- `storage/` exposes a `ProgressRepository`; IndexedDB is its browser implementation.
- `analytics/` derives teacher-facing metrics from event history; it never mutates curriculum data.
- `app/`, `pages/`, and `components/` will consume the public engine/repository interfaces only.
- Assets shipped at runtime live under `public/assets/`. Course assets are copied through an explicit allow-list only; no runtime `../kimi-english-learning-publish_Copy` reference is allowed.

## Core flow

```text
Catalog + ProgressRepository
        -> Scheduler (10 new / 15 review)
        -> SessionBuilder + QuestionFactory
        -> AttemptEvent stream
        -> mastery + spaced review + IndexedDB
        -> teacher analytics / JSON backup
```

## Data and compatibility

`src/types/learning.ts` owns versioned domain interfaces. IndexedDB schema migrations are explicit and backup payloads include their schema version. A future cloud repository implements the same `ProgressRepository` interface without requiring the engine or UI to know its transport.

## Rules encoded in the engine

- normal reappearance gap is at least four questions;
- retries are delayed five to eight questions;
- no more than two identical question types or three categories consecutively;
- a repeated target changes question type and, where applicable, visual variant;
- answer positions are selected with an eight-question sliding-window balance check;
- randomization is seeded so a session can be reproduced for QA.

