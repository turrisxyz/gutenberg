<?php

class WP_Token
{
	/**
	 * @var string
	 */
	public $namespace;

	/**
	 * @var string
	 */
	public $name;

	/**
	 * @var array
	 */
	public $attributes;

	/**
	 * @var string
	 */
	public $fallback;

	function __construct( $namespace, $name, $attributes = array(), $fallback = '' ) {
		$this->namespace  = $namespace;
		$this->name       = $name;
		$this->attributes = is_array( $attributes ) ? $attributes : array();
		$this->fallback   = $fallback;
	}
}

class WP_Token_Parser
{
	/**
	 * Replaces dynamic tokens in a document with the return value
	 * from their callback or with a fallback value if one exists.
	 */
	public static function swap_tokens( $url_prefix, $token_replacer, $input )
	{
		if ( ! is_string( $url_prefix ) || empty( $url_prefix ) ) {
			return null;
		}

		if ( ! is_callable( $token_replacer ) ) {
			return null;
		}

		if ( ! is_string( $input ) ) {
			return null;
		}

		$quoted_url_prefix = preg_quote( $url_prefix, '~' );

		return preg_replace_callback(
			"~{$quoted_url_prefix}#token{(?P<TOKEN_CONTENTS>[^#]*)}#~",
			function ( $matches ) use ( $url_prefix, $token_replacer ) {
				list( '0' => $full_match, 'TOKEN_CONTENTS' => $contents ) = $matches;

				$token = self::parse_token_contents( $contents );
				if ( ! $token ) {
					// Something is malformed, so skip it.
					return $full_match;
				}

				$output = call_user_func( $token_replacer, $token );
				return null !== $output ? $output : $token->fallback;
			},
			$input
		);
	}


	/**
	 * Parses the inner contents of a token.
	 *
	 * @param string $contents
	 * @return WP_Token|null The parsed token.
	 */
	public static function parse_token_contents( $contents ) {
		$matches = null;

		/*
		 * Token shorthand syntax allows for quicker entry of simple tokens.
		 *
		 * Examples:
		 *     https://token.wordpress.org/#token{core/identity}#
		 *     https://token.wordpress.org/#token{core/echo="\u003ctest\u003e"}#
		 */
		if ( 1 === preg_match(
			'~^(?P<NAMESPACE>[a-z][a-z\d-]*)/(?P<NAME>[a-z][a-z\d-]*)(?:=(?P<VALUE>.+))?$~i',
				$contents,
				$matches
		)) {
			$value = isset( $matches['VALUE'] ) ? self::json_decode( $matches['VALUE'] ) : null;

			return null === $value
				? new WP_Token( $matches['NAMESPACE'], $matches['NAME'] )
				: new WP_Token( $matches['NAMESPACE'], $matches['NAME'], array( 'value' => $value ) );
		}

		/*
		 * If not using the shorthand syntax we have to attempt to parse this as our augmented JSON.
		 *
		 * Examples:
		 *     https://token.wordpress.org/#token{"name":"query/published-date", "attributes":{"format":"%A"}}#
		 */
		$token_data = self::json_decode( "{{$contents}}" );
		if ( null === $token_data ) {
			// `null` is not an allowable value
			return null;
		}

		$name_matches = null;
		if ( ! isset( $token_data['name'] ) || ! preg_match( '~^(?P<NAMESPACE>[a-z][a-z\d]*)/(?P<NAME>[a-z][a-z\d]*)$~i', $token_data['name'], $name_matches ) ) {
			return null;
		}

		return new WP_Token(
			$name_matches['NAMESPACE'],
			$name_matches['NAME'],
			isset( $token_data['attributes'] ) ? $token_data['attributes'] : null,
			isset( $token_data['fallback'] ) ? $token_data['fallback'] : ''
		);
	}


	public static function json_decode( $input ) {
		return json_decode( $input, JSON_OBJECT_AS_ARRAY );
	}
}
