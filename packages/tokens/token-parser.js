/**
 * @typedef {Object} WPToken
 * @property {string}              namespace  e.g. "core", "query", or "my-plugin"
 * @property {string}              name       e.g. "home_url", "featured-iamge", "my-token"
 * @property {Record<string, any>} attributes defined by each token separately; `value` is special.
 * @property {string}              fallback   what to render if no matching token plugin available.
 */

/**
 * @callback TokenReplacer
 * @param {WPToken} token The parsed token to replace.
 * @return {string} the replacement string.
 */

/**
 * Replaces dynamic tokens in a document with the return value
 * from their callback or with a fallback value if one exists.
 *
 * @param {string}        urlPrefix
 * @param {TokenReplacer} tokenReplacer
 * @param {string}        input
 * @return {string}       output
 */
export const swapTokens = ( urlPrefix, tokenReplacer, input ) => {
	const quotedUrlPrefix = escapeRegExp( urlPrefix );

	return input.replace(
		new RegExp( `${ quotedUrlPrefix }#token{([^#]*)}#` ),
		( fullMatch, tokenContents ) => {
			const token = parseTokenContents( tokenContents );
			if ( ! token ) {
				return fullMatch;
			}

			return tokenReplacer( token ) ?? token.fallback;
		}
	);
};

/**
 * Parses the inner contents of a token.
 *
 * @param {string} contents the inner contents of a token to parse.
 * @return {WPToken|null} the parsed token or null if invalid.
 */
const parseTokenContents = ( contents ) => {
	const matches = contents.match(
		/^([a-z][a-z\d-]*)\/([a-z\d-]*)(?:=(.+))?$/i
	);
	if ( matches ) {
		const [ , namespace, name, rawValue ] = matches;
		const value = rawValue ? jsonDecode( rawValue ) : null;

		return value
			? { namespace, name, attributes: { value }, fallback: '' }
			: { namespace, name, attributes: {}, fallback: '' };
	}

	const tokenData = jsonDecode( `{${ contents }}` );
	if ( null === tokenData ) {
		return null;
	}

	const nameMatch = tokenData.name?.match(
		/^([a-z][a-z\d-]*)\/([a-z\d-]*)(?:=(.+))?$/i
	);
	if ( ! nameMatch ) {
		return null;
	}

	const [ , namespace, name ] = nameMatch;

	return { attributes: {}, fallback: '', ...tokenData, namespace, name };
};

const jsonDecode = ( s ) => JSON.parse( s );

/**
 * Borrowed directly from lodash to avoid including dependency.
 *
 * @param {string} raw input which might contain meaningful RegExp syntax.
 * @return {string} input with meaningful RegExp syntax escaped.
 */
const escapeRegExp = ( raw ) => raw.replace( /[\\^$.*+?()[\]{}|]/g, '\\$&' );
