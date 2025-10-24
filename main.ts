import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MovieDetailsSettings {
	API_Key: string;
}

const DEFAULT_SETTINGS: MovieDetailsSettings = {
	API_Key: 'default'
}

export default class MovieDetails extends Plugin {
	settings: MovieDetailsSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'get-movie-data',
			name: 'Get Movie Data',
			editorCallback: async (editor: Editor, _view: MarkdownView) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView == null) {
					new Notice("No valid open file!");
					return;
				}

				if (markdownView.file == null) {
					new Notice("No valid open file!");
					return;
				}

				let file = markdownView.file;
				let requestName = file.basename.replace(" ", "+");

				let url = "http://www.omdbapi.com/?t=" + requestName + "&apikey=" + this.settings.API_Key;
				const response = await fetch(url);

				if (!response.ok) {
					new Notice('API Called!\nRespone: ' + "FAIL" + "\nReason: " + response.status);
					return;
				}

				const result = await response.json();
				new Notice(ParsedData(result));
				markdownView.editor.setCursor(0, 0);
				markdownView.editor.replaceRange(ParsedData(result), markdownView.editor.getCursor());
				return;
			}


		});
		this.addSettingTab(new MovieDetailsTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MovieDetailsTab extends PluginSettingTab {
	plugin: MovieDetails;

	constructor(app: App, plugin: MovieDetails) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('OMDb API Key')
			.setDesc('Your API key to use OMDb. Plugin will not work if none is supplied.')
			.addText(text => text
				.setPlaceholder('API KEY')
				.setValue(this.plugin.settings.API_Key)
				.onChange(async (value) => {
					this.plugin.settings.API_Key = value;
					await this.plugin.saveSettings();
				}));
	}
}

interface Rating {
	Source: string;
	Value: string; // Keeping as string because formats vary (e.g. "8.6/10", "96%")
}

interface Movie {
	Title: string;
	Year: number;
	Rated: string;
	Released: Date;
	Runtime: number; // in minutes
	Genre: string;
	Director: string;
	Writer: string;
	Actors: string[];
	Plot: string;
	Language: string[];
	Country: string[];
	Awards: string;
	Poster: string;
	Ratings: Rating[];
	Metascore: number;
	imdbRating: number;
	imdbVotes: number;
	imdbID: string;
	Type: 'movie' | 'series' | 'episode' | string; // known OMDb types + fallback
	DVD?: Date | null;
	BoxOffice?: number | null;
	Production?: string | null;
	Website?: string | null;
	Response: boolean;
}


function ParsedData(data: Movie): string {
	let genreText = "\n";

	data.Genre.split(",").forEach(element => {
		genreText += "  - " + element.trim() + "\n";
	});

	return "---\n"
		+ "Year: " + data.Year + "\n"
		+ "Genre: " + genreText + "\n"
		+ "Director: " + data.Director + "\n"
		+ "IMDB ID: " + data.imdbID + "\n"
		+ "Rating: " + data.imdbRating + "\n"
		+ "Poster: " + data.Poster + "\n"
		+ "---";
}