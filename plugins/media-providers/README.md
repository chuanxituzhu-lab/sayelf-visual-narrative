# Media Provider plugins

Add a provider in `plugins/media-providers/<provider-id>/` with:

```text
manifest.json
plugin.mjs
```

The manifest follows `schemas/media-provider-manifest.schema.json`. Its module
exports `createProvider()` and returns `submit({ jobId, request })`; optional
`poll()` supports asynchronous providers. Return a provider-neutral result:

```js
{ status: 'completed', assets: [{ data, mime_type }] }
// or { status: 'processing', provider_job_id: 'remote-id' }
```

Supported request modes are `text_to_image`, `image_to_video`, and
`text_to_video`. The core owns job state, local asset persistence, preview and
download URLs. Providers own only their API mapping. Keep API keys in local
environment variables and never return them in results or logs.
