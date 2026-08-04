# Security

Memory AI Local is a local-first Alpha. It stores project context, local media,
agent credentials, and backups under the local `data/` directory. That directory
is excluded from Git and must never be committed or attached to a public issue.

## Current security boundary

- The HTTP service listens on `127.0.0.1` by default.
- Coding agents receive independent local credentials and project-level permissions.
- Agent write tools create approval proposals instead of directly changing long-term memory.
- Life Memory is not exposed through the MCP tool surface.
- Application-level encryption at rest is not implemented yet. Use a protected OS account
  and BitLocker or another trusted full-disk encryption solution for sensitive data.

## Reporting a vulnerability

Please use the repository's **Security** tab to open a private security advisory.
Do not include real memory data, photos, database files, access tokens, credentials,
absolute personal paths, or backups in a public issue.

For ordinary bugs that contain no sensitive information, open a regular GitHub issue
with the app version, operating system, Node.js version, reproduction steps, and the
smallest possible sanitized log excerpt.
