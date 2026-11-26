# Content pages (team-written)

Legal pages, Learn articles and the dengue guide are written here in Markdown, in both languages.
`npm run content:build` turns them into `generated/*.json`, which the app shows with `CMP-Markdown`
(specs §1.3.5). Never edit `generated/` by hand.

## File names

| Page | English | Bangla |
|---|---|---|
| Privacy notice | `legal/privacy.en.md` | `legal/privacy.bn.md` |
| Terms of use | `legal/terms.en.md` | `legal/terms.bn.md` |
| Learn articles | `en/<topic>.md` | `bn/<topic>.md` |

## What you can use

- The first line is the page title: `# Privacy notice`
- Section headings: `## …` and `### …`
- Paragraphs, bullet lists (`- …`) and numbered lists (`1. …`)
- **Bold** (`**bold**`), *italic* (`*italic*`)
- Links: `[text](https://…)`, `[text](mailto:…)` or an app page such as `[Terms](/terms)`

Anything else (pictures, tables, code, HTML, `http://` links) stops the build with a message that says which
file and what to change, so nothing silently disappears from a legal page.
