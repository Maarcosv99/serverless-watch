import type { AWS } from "@serverless/typescript";

const serverless: AWS = {
	service: "sls-auto-deploy",
	frameworkVersion: "3",
	plugins: ["serverless-esbuild", "../src/index.js", "serverless-offline"],
	provider: {
		name: "aws",
		runtime: "nodejs16.x",
		region: "sa-east-1",
		deploymentMethod: "direct",
		stage: "dev",
		apiGateway: {
			minimumCompressionSize: 1024,
			shouldStartNameWithService: true,
		},
		environment: {},
	},
	package: {
		individually: true,
		excludeDevDependencies: true,
	},
	functions: {
		hello: {
			handler: "src/index.handler",
			events: [
				{
					httpApi: { path: "/soma", method: "get" },
				},
			],
		},
	},
	custom: {
		esbuild: {
			bundle: true,
			minify: true,
			sourcemap: true,
			exclude: ["*"],
			target: "node16",
			define: { "require.resolve": undefined },
			platform: "node",
			concurrency: 16,
		},
		"serverless-offline": {
			useChildProcesses: true,
		},
		serverlessWatch: {
			includes: ["src"],
		},
	},
};

module.exports = serverless;
