export const jsTester = ( parse ) => () => {
	describe( 'various forms of the token syntax', () => {
		it( 'recognizes basic forms of the token syntax', () => {
			expect(
				parse(
					'https://token.wordpress.org/#token{"name":"core/identity"}#'
				)
			).toEqual( {
				tokens: [
					{
						namespace: 'core',
						name: 'identity',
						attributes: {},
						fallback: '',
					},
				],
				output: '{{TOKEN_1}}',
			} );

			expect(
				parse( 'https://token.wordpress.org/#token{core/identity}#' )
			).toEqual( {
				namespace: 'core',
				name: 'identity',
				attributes: {},
				fallback: '',
			} );

			expect(
				parse(
					'https://token.wordpress.org/#token{core/echo="\u{3c}"}#'
				)
			).toEqual( {
				namespace: 'core',
				name: 'echo',
				attributes: { value: '<' },
				fallback: '',
			} );

			expect(
				parse(
					'https://token.wordpress.org/#token{{"name":"my_plugin/widget", "attributes": {"name": "sprocket"}, "fallback": "just a sprocket"}#'
				)
			).toEqual( {
				namespace: 'my_plugin',
				name: 'widget',
				attributes: { name: 'sprocket' },
				fallback: 'just a sprocket',
			} );

			expect(
				parse(
					'https://token.wordpress.org/#token{my_plugin/widget,{"name":"sprocket"},"just a sprocket"}#'
				)
			).toEqual( {
				namespace: 'my_plugin',
				name: 'widget',
				attributes: { name: 'sprocket' },
				fallback: 'just a sprocket',
			} );
		} );
	} );
};

const hasPHP =
	'test' === process.env.NODE_ENV
		? ( () => {
				const process = require( 'child_process' ).spawnSync(
					'php',
					[ '-r', 'echo 1;' ],
					{
						encoding: 'utf8',
					}
				);

				return process.status === 0 && process.stdout === '1';
		  } )()
		: false;

// Skipping if `php` isn't available to us, such as in local dev without it
// skipping preserves snapshots while commenting out or simply
// not injecting the tests prompts `jest` to remove "obsolete snapshots"
const makeTest = hasPHP
	? // eslint-disable-next-line jest/valid-describe-callback, jest/valid-title
	  ( ...args ) => describe( ...args )
	: // eslint-disable-next-line jest/no-disabled-tests, jest/valid-describe-callback, jest/valid-title
	  ( ...args ) => describe.skip( ...args );

export const phpTester = ( name, filename ) =>
	makeTest(
		name,
		'test' === process.env.NODE_ENV
			? jsTester( ( doc ) => {
					const process = require( 'child_process' ).spawnSync(
						'php',
						[ '-f', filename ],
						{
							input: doc,
							encoding: 'utf8',
							timeout: 30 * 1000, // Abort after 30 seconds, that's too long anyway.
						}
					);

					if ( process.status !== 0 ) {
						throw new Error( process.stderr || process.stdout );
					}

					try {
						/*
						 * Due to an issue with PHP's json_encode() serializing an empty associative array
						 * as an empty list `[]` we're manually replacing the already-encoded bit here.
						 *
						 * This is an issue with the test runner, not with the parser.
						 */
						return JSON.parse(
							process.stdout.replace(
								/"attributes":\s*\[\]/g,
								'"attributes":{}'
							)
						);
					} catch ( e ) {
						console.error( process.stdout );
						throw new Error(
							'failed to parse JSON:\n' + process.stdout
						);
					}
			  } )
			: () => {}
	);
