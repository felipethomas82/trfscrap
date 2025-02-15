# trfscrap

## Overview

`trfscrap` is a web scraping tool designed to automate searches in judicial databases. It extracts relevant legal documents from the TRF4 jurisprudence portal and stores them in a MongoDB collection for further processing.

## Features

- Automated web scraping using `Puppeteer`.
- Data storage and management with `MongoDB`.
- Filtering and categorization of judicial documents.
- Support for handling different document formats, including HTML and plain text.
- Progress tracking and estimated time calculations.

## Technologies Used

- **Node.js**: JavaScript runtime.
- **Puppeteer**: Headless Chrome automation.
- **MongoDB**: NoSQL database for storing document paths.
- **fs (File System Module)**: File handling operations.

## Installation

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Puppeteer](https://pptr.dev/)

### Steps

1. Clone this repository:
   ```sh
   git clone https://github.com/yourusername/trfscrap.git
   cd trfscrap
   ```
2. Install dependencies:
   ```sh
   npm install puppeteer mongodb
   ```
3. Start your MongoDB server:
   ```sh
   mongod --dbpath /path/to/db
   ```
4. Update MongoDB connection details in `main.js` if needed.
5. Run the scraper:
   ```sh
   node main.js
   ```

## How It Works

1. Reads search queries from `search_strings.txt`.
2. Performs searches on the TRF4 jurisprudence portal.
3. Extracts document links and stores them in MongoDB.
4. Iterates over stored links and downloads document contents.
5. Saves extracted data in the `scraped/` folder.
6. Updates MongoDB entries to track processed documents.

## Database Structure

- **Database Name**: `trfscrap`
- **Collection**: `toScrap`
  - `path` (String): Document URL.
  - `scraped` (Boolean): Processing status.

## Important Functions

- `insertScrape(paths)`: Inserts document links into MongoDB.
- `getToScrap()`: Retrieves the next document path to process.
- `getCountToScrap()`: Counts remaining documents to be scraped.
- `updatePath(path, scraped)`: Updates processing status of a document.
- `getProcNumber(pathToScrap)`: Extracts process number from URL.

## Handling Access Restrictions

If the script encounters access restrictions:

- It detects "Acesso negado" messages and retries later.
- Skips PDF files as they are not processed.
- Logs progress and errors for debugging.

## Future Improvements

- Add support for PDF extraction and parsing.
- Implement rate-limiting to avoid server blocking.
- Enhance error handling and retry mechanisms.
- Create a UI for monitoring and managing the scraping process.

## License

This project is licensed under the MIT License.

## Author

Developed by Felipe Thomas.

## Contribution

Feel free to submit issues or pull requests to improve the project!

