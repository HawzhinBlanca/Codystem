# Architecture

> Keep this small. Describe the **shape** of the system, not every symbol. Derive code
> maps from the LSP (Serena) on demand — do not hand-maintain a symbol catalogue here.

## System shape
<one paragraph / one diagram: the major components and how requests/data flow between them>

## Key boundaries
- <module / service> — responsibility, what it owns, what it must not touch.

## External dependencies
- <runtime dependency> — why it exists (link the ADR in docs/DECISIONS.md).

## Data flow
<entry point → processing → output; note where external input is validated>
