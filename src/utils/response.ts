interface ApiResponse {
	statusCode: number;
	headers: {
		"Content-Type": string;
		"Access-Control-Allow-Origin": string;
		"Access-Control-Allow-Headers": string;
		"Access-Control-Allow-Methods": string;
	};
	body: string;
}

export const success = (data: any, statusCode: number = 200): ApiResponse => ({
	statusCode,
	headers: {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type,Authorization",
		"Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
	},
	body: JSON.stringify({
		success: true,
		data,
	}),
});

export const error = (message: string, statusCode: number = 500, code?: string): ApiResponse => ({
	statusCode,
	headers: {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type,Authorization",
		"Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
	},
	body: JSON.stringify({
		success: false,
		error: {
			message,
			code,
		},
	}),
});