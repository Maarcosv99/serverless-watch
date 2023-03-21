export function sum(a?: string, b?: string): number {
	if (!a || !b) {
		return 0;
	}

	return Number(a) + Number(b);
}

export function subtract(a?: string, b?: string): number {
	if (!a || !b) {
		return 0;
	}

	return Number(a) - Number(b);
}

export function multiply(a?: string, b?: string): number {
	if (!a || !b) {
		return 0;
	}

	return Number(a) * Number(b);
}
