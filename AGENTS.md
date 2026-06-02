<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repo-specific workflow

- Do not run live/provider requests automatically, including Twelve Data market-data pulls. Only make external API requests when the user explicitly asks for verification or a live request.
