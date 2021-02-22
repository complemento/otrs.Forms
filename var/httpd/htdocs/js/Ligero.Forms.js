"use strict";

var Core     = Core || {};
var Ligero   = Ligero || {};
Ligero.Forms = (function (TargetNS) {

	/**
	 * Initialize module
	 *
	 * @return void
	 */
	TargetNS.Init = function () {

		// Bind change event on service id field
		$("#ServiceID[data-ligeroform!='ok']")
			.bind('change', Ligero.Forms.Load)
			.attr('data-ligeroform','ok'); // prevent event rewrite

		// Trigger service change
		$('#ServiceID').trigger('change');

		return;

	};

	/**
	 * Load service form based on selected service ID
	 *
	 * @return void
	 */
	TargetNS.Load = function () {
		
		var ServiceID = $(this).val();

		// Return on empty service ID
		if ( !ServiceID ) return;

		// Load Ligero Forms
		Core.AJAX.FunctionCall(
			Core.Config.Get('CGIHandle'),
			{
				Module:    Core.Config.Get('Action'),
				Action:    'LigeroForms',
				Subaction: 'Load',
				ServiceID: ServiceID
				
			},
			Ligero.Forms.HandleFormFields
		);

		return;

	}

	/**
	 * Render form fields on DOM based on the given config
	 *
	 * @param Object Response
	 * @return void
	 */
	TargetNS.HandleFormFields = function( Response ) {

		console.log( 'Ligero.Forms.HandleFormFields()' );
		console.log( ' * Rendering form', Response.Form.Name );

		// Disable input while rendering form fields
		Core.UI.InputFields.Deactivate();
		
		Response.Fields.forEach( function( f ) {

			console.log( ' => Rendering field', f.Name );
			$( '.SpacingTop:first' ).before( f.Content );

		});

		// Enable input after form fields rendering
		Core.UI.InputFields.Activate();

		return;


	}

	return TargetNS;

}(Ligero.Forms || {}));

