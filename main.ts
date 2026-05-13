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
		try {
			await this.loadSettings();
		} catch (error) {
			console.error('Failed to load settings:', error);
			new Notice('Failed to load plugin settings. Using defaults.');
			this.settings = DEFAULT_SETTINGS;
		}

		this.addCommand({
			id: 'get-movie-data',
			name: 'Get Movie Data By Title',
			editorCallback: async (editor: Editor, _view: MarkdownView) => {
				try {
					const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (markdownView == null) {
						new Notice("No valid open file!");
						return;
					}

					if (!this.settings.API_Key || this.settings.API_Key === 'default') {
						new Notice("API Key not configured! Please set it in plugin settings.");
						return;
					}

					await GetMovieDataByTitle(markdownView, this.settings.API_Key);
				} catch (error) {
					console.error('Error in get-movie-data command:', error);
					new Notice('An unexpected error occurred. Check console for details.');
				}
			}
		});

		this.addCommand({
			id: 'get-movie-data-by-id',
			name: 'Get Movie Data By ID',
			editorCallback: async (editor: Editor, _view: MarkdownView) => {
				try {
					const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (markdownView == null) {
						new Notice("No valid open file!");
						return;
					}

					if (!this.settings.API_Key || this.settings.API_Key === 'default') {
						new Notice("API Key not configured! Please set it in plugin settings.");
						return;
					}

					await GetMovieDataByID(markdownView, this.settings.API_Key);
				} catch (error) {
					console.error('Error in get-movie-data-by-id command:', error);
					new Notice('An unexpected error occurred. Check console for details.');
				}
			}
		});
		
		this.addSettingTab(new MovieDetailsTab(this.app, this));
	}

	onunload() {
		// Cleanup if needed
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
			.setDesc('Your API key to use OMDb. Get one from https://www.omdbapi.com/apikey.aspx')
			.addText(text => text
				.setPlaceholder('Enter your OMDb API key')
				.setValue(this.plugin.settings.API_Key)
				.onChange(async (value) => {
					this.plugin.settings.API_Key = value;
					try {
						await this.plugin.saveSettings();
					} catch (error) {
						console.error('Failed to save settings:', error);
						new Notice('Failed to save API key. Please try again.');
					}
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
	if (!data || !data.Genre) {
		console.warn('Invalid movie data provided to ParsedData');
		return '';
	}

	let genreText = "\n";

	try {
		data.Genre.split(",").forEach(element => {
			genreText += "  - " + element.trim() + "\n";
		});
	} catch (error) {
		console.error('Failed to parse genres:', error);
		genreText = "\n  - Unknown\n";
	}

	return "---\n"
		+ "Title: " + (data.Title || "Unknown") + "\n"
		+ "Year: " + (data.Year || "Unknown") + "\n"
		+ "Genre: " + genreText
		+ "Director: " + (data.Director || "Unknown") + "\n"
		+ "IMDB ID: " + (data.imdbID || "Unknown") + "\n"
		+ "Rating: " + (data.imdbRating || "Unknown") + "\n"
		+ "Poster: " + (data.Poster || "N/A") + "\n"
		+ "---";
}

function GetFileTitle(markdownView: MarkdownView): string | null {
	const file = markdownView.file;
	if (file == null) {
		console.warn('GetFileTitle: markdownView.file is null');
		return null;
	}
	const title = file.basename.replace(/\s+/g, "+");
	if (!title) {
		console.warn('GetFileTitle: file basename is empty');
		return null;
	}
	return title;
}

function InsertData(markdownView: MarkdownView, result: Movie): void {
	try {
		const parsedData = ParsedData(result);
		if (!parsedData) {
			new Notice('Failed to parse movie data.');
			return;
		}

		markdownView.editor.setCursor(0, 0);
		markdownView.editor.replaceRange(parsedData + "\n", markdownView.editor.getCursor());
	} catch (error) {
		console.error('Failed to insert data into editor:', error);
		new Notice('Failed to insert movie data into file.');
	}
}

async function GetMovieDataByTitle(markdownView: MarkdownView, apikey: string): Promise<void> {
	if (markdownView.file == null) {
		new Notice("No valid open file!");
		return;
	}

	const requestName = GetFileTitle(markdownView);
	if (!requestName) {
		new Notice("Failed to get file name. Cannot search for movie.");
		return;
	}

	const url = "http://www.omdbapi.com/?t=" + requestName + "&apikey=" + apikey;
	
	try {
		const response = await fetch(url);
		
		if (!response.ok) {
			new Notice(`API request failed: HTTP ${response.status}`);
			console.error(`GetMovieDataByTitle: HTTP error ${response.status}`);
			return;
		}

		let result: any;
		try {
			result = await response.json();
		} catch (parseError) {
			console.error('Failed to parse API response as JSON:', parseError);
			new Notice('API returned invalid response. Please check API key and try again.');
			return;
		}

		if (result.Response === "False") {
			new Notice(`API Error: ${result.Error ?? "Unknown error from OMDb API"}`);
			return;
		}

		if (!result.Title) {
			new Notice('API returned incomplete movie data.');
			console.warn('GetMovieDataByTitle: API response missing Title field', result);
			return;
		}

		InsertData(markdownView, result);
		new Notice('Success!');
	} catch (error) {
		console.error('GetMovieDataByTitle network error:', error);
		new Notice('Network error: Failed to fetch movie data. Check your connection.');
	}
}

async function GetMovieDataByID(markdownView: MarkdownView, apikey: string): Promise<void> {
	const requestName = GetFileTitle(markdownView);
	if (!requestName) {
		new Notice("Failed to get file name. Cannot search for movie.");
		return;
	}

	const url = "http://www.omdbapi.com/?i=" + requestName + "&apikey=" + apikey;

	try {
		const response = await fetch(url);
		
		if (!response.ok) {
			new Notice(`API request failed: HTTP ${response.status}`);
			console.error(`GetMovieDataByID: HTTP error ${response.status}`);
			return;
		}

		let result: any;
		try {
			result = await response.json();
		} catch (parseError) {
			console.error('Failed to parse API response as JSON:', parseError);
			new Notice('API returned invalid response. Please check API key and try again.');
			return;
		}

		if (result.Response === "False") {
			new Notice(`API Error: ${result.Error ?? "Unknown error from OMDb API"}`);
			return;
		}

		if (!result.Title) {
			new Notice('API returned incomplete movie data.');
			console.warn('GetMovieDataByID: API response missing Title field', result);
			return;
		}

		InsertData(markdownView, result);
		
		try {
			AddMovieTitleToFile(markdownView, result);
		} catch (error) {
			console.error('Failed to add movie title to file:', error);
			new Notice('Successfully fetched movie data, but failed to add title.');
			return;
		}

		new Notice('Success!');
	} catch (error) {
		console.error('GetMovieDataByID network error:', error);
		new Notice('Network error: Failed to fetch movie data. Check your connection.');
	}
}

function AddMovieTitleToFile(markdownView: MarkdownView, result: any): void {
	if (!result || !result.Title) {
		console.warn('AddMovieTitleToFile: Invalid result object');
		throw new Error('Invalid movie result');
	}

	try {
		const lastLine = markdownView.editor.lastLine();
		markdownView.editor.setCursor(lastLine);
		markdownView.editor.replaceRange("\n# " + result.Title, markdownView.editor.getCursor());
	} catch (error) {
		console.error('AddMovieTitleToFile: Failed to modify editor', error);
		throw error;
	}
}
