# Serverless Watch

Track changes in your lambda in real time, using Serverless Framework.

## Installation

Install the package:

```bash
npm i -D serverless-watch
```

And then, add the package as a plugin in your serverless framework configuration file:

```bash
serverless-watch
```

## Usage

Run the following command below to run serverless-watch:

```bash
serverless watch
```

Use the main serverless framework parameters, such as `function`, `stage` and `config`.

## Usage examples

The command below will update your serverless application, publishing in the development stage when a change is made.

```bash
serverless watch --stage dev
```

The command below will only track changes to the function named `hello`.

```bash
serverless watch --function hello
```

## Support

The package has only been tested on version 3 of the serverless framework.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
