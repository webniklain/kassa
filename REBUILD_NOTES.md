# Kassa Core 2.0 rebuild

- Startup no longer waits on a top-level authentication promise.
- Authentication subscription is registered before the first UI render.
- UI rendering is isolated so one rendering error cannot stop Firebase sync.
- Cloud startup has clear stage logs and error handling.
- Analytics and category buttons use mobile-safe click handling.
- CSS and app module URLs are versioned to bypass stale browser caches.
