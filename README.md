# Kimi Word Adventure

Independent vocabulary-memory foundation for English Adventure. See [ARCHITECTURE.md](ARCHITECTURE.md) and [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md).

```powershell
pnpm install
pnpm audit:content
pnpm test
pnpm build
```

To copy the explicitly approved source-course assets at build time only:

```powershell
$env:KIMI_COURSE_ASSET_ROOT = "D:\桌面\Kimi_Copy\kimi-english-learning-publish_Copy\assets"
pnpm sync:course-assets
```

## GitHub Pages

Push the `main` branch to a GitHub repository named `kimi-word-adventure`, then
select **GitHub Actions** as the Pages source in the repository settings. The
included workflow tests, builds, and deploys the application automatically.

## Learning data

GitHub Pages is a static website. In this release, learning records stay in the
browser used for practice. The Teacher page on that same browser can show that
browser's progress.
