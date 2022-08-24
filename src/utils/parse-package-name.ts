export function parsePackageName(
	request: string,
) {
	const segments = request.split('/');
	let packageName = segments.shift()!;
	if (packageName[0] === '@' && segments[0]) {
		packageName += `/${segments.shift()}`;
	}

	return {
		packageName,
		packageSubpath: segments.join('/'),
	};
}
