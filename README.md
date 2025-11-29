# Movie Details — Obsidian Plugin

A plugin for Obsidian that provides detailed information about movies directly within notes. It retrieves data from external sources such as title, release year, cast, description, and poster images. The plugin aims to be lightweight and provides basic customization options.

## What it Does

- Displays movie information including synopsis, cast, posters, and ratings.
- Integrates with Obsidian for inline movie details in notes.
- Supports style customization through CSS.
- Built in TypeScript for maintainability.
- Fast build process with esbuild.
- Includes versioning tools.

## Usage

- Reference or highlight a movie in a note.
- The plugin automatically fetches and displays relevant data.
- Customization can be adjusted through the manifest (`manifest.json`) or stylesheet (`styles.css`).

## Main Files

- `main.ts`: Plugin logic.
- `manifest.json`: Plugin configuration and permissions.
- `package.json`: Dependency and script definitions.
- `styles.css`: Plugin user interface styles.
- `AGENTS.md`: Integration documentation.
- Build and configuration: `esbuild.config.mjs`, `tsconfig.json`, etc.

## Notes and Limitations

- Supported movie databases and plugin features may change over time.
- Some data sources may require API keys.
- Additional information is available in the commit history and `AGENTS.md`.

## License

Refer to the `LICENSE` file for licensing details.
