# Talend2Postman

A tool to convert JSON exported from Talend API Tester to Postman v2.1 collection format.

## Features

- Handles multiple APIs, services, and requests.
- Preserves request bodies, headers, and placeholders.
- Compatible with Postman v2.1 schema.

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd talend2postman
    ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Make the script executable:

    ```bash
    chmod +x src/index.js
    ```

## Usage

### Convert a File

Run the following command to convert a Talend JSON file to Postman format:

```bash
node src/index.js <input-file> <output-file>
```

For example:

```bash
node src/index.js talend_input.json postman_output.json
```

## Run as a CLI Tool

After installing dependencies, you can link the tool globally:

```bash
npm link
```

Then you can run the tool from anywhere:

```bash
talend2postman <input-file> <output-file>
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
