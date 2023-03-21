import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { subtract } from "./logic";

export const handler = async (
	event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
	if (!event.queryStringParameters) {
		return {
			statusCode: 400,
			body: JSON.stringify(
				{
					message: "No query string parameters",
					input: event,
				},
				null,
				2
			),
		};
	}

	const { a, b } = event.queryStringParameters;

	return {
		statusCode: 200,
		body: JSON.stringify(
			{
				message: `Resultado: ${a} + ${b} = ${subtract(a, b)}`,
				input: event,
			},
			null,
			2
		),
	};
};
