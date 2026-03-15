
export type ErrorNormal = {
    message: string
}

export type ErrorParam = {
    message: string
	param?: string
	expectedType?:  string
	receivedValue?: any
}

export type RequestResponse<T> = {
	items: T[];
	metadata: MetaData;
}

export type MetaData = {
	page: number;
	size: number;
	total: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
}