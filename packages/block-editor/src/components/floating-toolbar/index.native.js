/**
 * External dependencies
 */
import { Animated, Easing, View, Platform } from 'react-native';

/**
 * WordPress dependencies
 */
import { ToolbarButton, Toolbar } from '@wordpress/components';
import { useEffect, useState, forwardRef } from '@wordpress/element';
import { withSelect, withDispatch } from '@wordpress/data';
import { compose } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import styles from './styles.scss';
import NavigateUpSVG from './nav-up-icon';
import BlockSelectionButton from '../block-list/block-selection-button.native';
import { store as blockEditorStore } from '../../store';
import { useAnimations } from '../floating-toolbar-animations';

const EASE_IN_DURATION = 250;
const EASE_OUT_DURATION = 80;
const TRANSLATION_RANGE = 8;

const opacity = new Animated.Value( 0 );

const FloatingToolbar = ( {
	selectedClientId,
	parentId,
	showFloatingToolbar,
	onNavigateUp,
	isRTL,
	innerRef,
} ) => {
	// Sustain old selection for proper block selection button rendering when exit animation is ongoing.
	const [ previousSelection, setPreviousSelection ] = useState( {} );

	const { shake } = useAnimations( innerRef );

	useEffect( () => {
		Animated.timing( opacity, {
			toValue: showFloatingToolbar ? 1 : 0,
			duration: showFloatingToolbar
				? EASE_IN_DURATION
				: EASE_OUT_DURATION,
			easing: Easing.ease,
			useNativeDriver: true,
		} ).start();
	}, [ showFloatingToolbar ] );

	useEffect( () => {
		if ( showFloatingToolbar )
			setPreviousSelection( { clientId: selectedClientId, parentId } );
	}, [ selectedClientId ] );

	const translationRange =
		( Platform.OS === 'android' ? -1 : 1 ) * TRANSLATION_RANGE;

	const translation = opacity.interpolate( {
		inputRange: [ 0, 1 ],
		outputRange: [ translationRange, 0 ],
	} );

	const animationStyle = [
		{
			opacity,
			transform: [ { translateY: translation } ],
		},
		shake.animationStyle,
	];

	const {
		clientId: previousSelectedClientId,
		parentId: previousSelectedParentId,
	} = previousSelection;

	const showPrevious = previousSelectedClientId && ! showFloatingToolbar;
	const blockSelectionButtonClientId = showPrevious
		? previousSelectedClientId
		: selectedClientId;
	const showNavUpButton =
		!! parentId || ( showPrevious && !! previousSelectedParentId );

	return (
		!! opacity && (
			<Animated.View style={ [ styles.floatingToolbar, animationStyle ] }>
				{ showNavUpButton && (
					<Toolbar passedStyle={ styles.toolbar }>
						<ToolbarButton
							title={ __( 'Navigate Up' ) }
							onClick={
								! showPrevious &&
								( () => onNavigateUp( parentId ) )
							}
							icon={ <NavigateUpSVG isRTL={ isRTL } /> }
						/>
						<View style={ styles.pipe } />
					</Toolbar>
				) }
				<BlockSelectionButton
					clientId={ blockSelectionButtonClientId }
				/>
			</Animated.View>
		)
	);
};

const ComposedFloatingToolbar = compose( [
	withSelect( ( select ) => {
		const {
			getSelectedBlockClientId,
			getBlockHierarchyRootClientId,
			getBlockRootClientId,
			getBlockCount,
			getSettings,
		} = select( blockEditorStore );

		const selectedClientId = getSelectedBlockClientId();

		if ( ! selectedClientId ) return;

		const rootBlockId = getBlockHierarchyRootClientId( selectedClientId );

		return {
			selectedClientId,
			showFloatingToolbar: !! getBlockCount( rootBlockId ),
			parentId: getBlockRootClientId( selectedClientId ),
			isRTL: getSettings().isRTL,
		};
	} ),
	withDispatch( ( dispatch ) => {
		const { selectBlock } = dispatch( blockEditorStore );

		return {
			onNavigateUp( clientId, initialPosition ) {
				selectBlock( clientId, initialPosition );
			},
		};
	} ),
] )( FloatingToolbar );

const ForwardedFloatingToolbar = forwardRef( ( props, ref ) => (
	<ComposedFloatingToolbar innerRef={ ref } { ...props } />
) );

export default ForwardedFloatingToolbar;
