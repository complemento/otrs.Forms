// --
// --
// This software comes with ABSOLUTELY NO WARRANTY. For details, see
// the enclosed file COPYING for license information (AGPL). If you
// did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
// --

"use strict";

var Core = Core || {};
Core.Agent = Core.Agent || {};
Core.Agent.DynamicFieldByServicePreLoad = {};
Core.Agent.DynamicFieldByServiceLastFocus = null;
Core.Agent.DynamicFieldByService = (function (TargetNS) {

	/**
	 * @name Init
	 * @memberof Core.Agent.TicketProcess
	 * @function
	 * @description
	 *      This function initializes the special module functions.
	 */
	TargetNS.Init = function () {
		var arrayJSON;
		var objectJSON;

		// Store the fields which were load by Service Forms
		// Used for several functions bellow
		var reloadFields = "";

		// First load of CustomerTicketMessage, when user is coming from Ligero Catalog navigation
		// This will trigger Service change in order to load service specific fields
		if ($('[data-ligeroform=ok]').length == 0 && $("[name=Action]").val() == "CustomerTicketMessage" && $("#ServiceID").val() != "") {
			setTimeout(function () {
				$('#ServiceID').trigger("change");
			}, 1);
		}
		// Monitora a mudança do campo Serviço e dos campos dinamicos
		$("#ServiceID[data-ligeroform!='ok']").each(function () {
			$(this).bind('change', function () {
				if ($('#ServiceID').val()) {
					var formID = "";
					$("form").each(function () {
						if ($(this).attr("name") == "compose") {
							formID = $(this).attr("id");
						}
	
					});
					var Data = {
						Action: 'DynamicFieldByService',
						Subaction: 'DisplayActivityDialogAJAX',
						ServiceDynamicID: $('#ServiceID').val(),
						// @TODO: remove InterfaceName cascade (from .pm)
						InterfaceName: 'xxxxxxxxxxxxxxxxxxxxxxx',
						// InterfaceName: formID,
						IsAjaxRequest: 1,
						IsMainWindow: 1
					};

					// Remove Form fields from last selected service
					// @TODO: create a specific function to clean last selected service form fields
					$('.AddDFS').each(function () {
						var $that = $(this);
						$($that).parent().parent().fadeOut(400, function () {
							$($that).parent().parent().empty();
						});
					});

					// get new Service Form content
					Core.AJAX.FunctionCall(
						Core.Config.Get('CGIHandle'),
						Data,
						function (Response) {
							if (Response == 0) {
								return;
							}

							// Get form values before dynamic field update
							// This is useful when new fields are added from ACLs and
							// we need to recreate the form and replace fields tha were already 
							// in the screen
							try {
								$(Response).find('.AddDFS').each(function() {
									var dfsID = $(this).attr('id');
									$('#' + dfsID).not('.AddDFS').each(function() {
										Core.Agent.DynamicFieldByServicePreLoad[ dfsID ] = {
											value: $(this).val(),
											attr:  $(this).attr('class')
										};
										$(this).parent().parent().remove();
									});
								});
							} catch(e) {}
							Core.Agent.DynamicFieldByServicePreLoad[ 'Message' ] = {
								value: $('#RichText').val()
							};

							var res = Response.split(':$$:Add:$$:');
							
							// Response receives the HTML to be loaded
							Response = res[0];

							// arrayJSON  receives the default values of service forms fields
							arrayJSON = res[1].split('@%@%@');

							var i;
							reloadFields = "";
							var AgentFieldConfigInsert = ".SpacingTop:first";
							var CustomerFieldConfigInsert = "#BottomActionRow";

							// Set default values for the Service Form fields,
							// before adding them to the DOM. Also add fields to reloadFields
							// variable
							for (i = 0; i < arrayJSON.length; i++) {
								objectJSON = $.parseJSON(arrayJSON[i]);
								$.each(objectJSON, function (key, val) {
									if (key && val) {
										if (key === "Message" && val.trim().length) {
											window.CKEDITOR.instances['RichText'].on('instanceReady', function() { 
												window.CKEDITOR.instances['RichText'].setData(val);
											});
											// @TODO: check if instances is already ready instead of
											// just triggering the funciton bellow.
											// The following line is needed because when the service is changed
											// the code above is not triggered since 'instanceReady' will not be
											// triggered again.
											window.CKEDITOR.instances['RichText'].setData(val);
											reloadFields += "" + key + ",";
										} else if (key === "HideArticle" && val === '1') {
											$('#Subject').parent().hide();
											$('.RichTextHolder').hide();
											$('.DnDUploadBox').parent().parent().hide();
										} else if (key === "AgentFieldConfig") {
											AgentFieldConfigInsert = "" + val + "";
										} else if ($('#' + key).length > 0) {
											reloadFields += "" + key + ",";
											$('#' + key).val(val);

											// Refreshs the DOM in order to certify Modernize
											// recognizes the default value of the field
											// @TODO: check if it's needed since those functions
											// are already called bellow without context
											Core.UI.InputFields.Deactivate($('#' + key));
											Core.UI.InputFields.Activate($('#' + key));

										}
										if (key === "CustomerFieldConfig") {
											// Change the form placement default selector
											CustomerFieldConfigInsert = "" + val + "";
										}
									}

								});
							}
							reloadFields = reloadFields.substring(0, reloadFields.length - 1);

							// Takes the placement for the fields
							var FieldConfigInsert = "";
							if (formID === "NewCustomerTicket") {
								FieldConfigInsert = CustomerFieldConfigInsert;
							} else {
								FieldConfigInsert = AgentFieldConfigInsert;
							}

							var $ElementToUpdate = $(Response).insertBefore(FieldConfigInsert);

							var JavaScriptString = '';
							var ErrorMessage;


							////////////////////////////////////////////////////////
							Core.UI.InputFields.Deactivate();
							Core.UI.InputFields.Activate();
							//////////////////////////////////////////////////
							if ($ElementToUpdate && isJQueryObject($ElementToUpdate) && $ElementToUpdate.length) {
								$ElementToUpdate.find('script').each(function () {
									JavaScriptString += $(this).html();
									$(this).remove();
								});

								$ElementToUpdate.fadeIn();
								Core.UI.InputFields.Activate($ElementToUpdate);
								try {
									/*eslint-disable no-eval */
									eval(JavaScriptString);
									/*eslint-enable no-eval */
								} catch (Event) {
									// do nothing here (code needed  to not have an empty block here)
									$.noop(Event);
								}

								// Handle special server errors (Response = <div class="ServerError" data-message="Message"></div>)
								// Check if first element has class 'ServerError'
								// @TODO: Complemento: probably error messages are not working ok on Service Forms,
								// 		  since we don't have ProcessEntityIDServerError on DOM
								if ($ElementToUpdate.children().first().hasClass('ServerError')) {
									ErrorMessage = $ElementToUpdate.children().first().data('message');

									// Add class ServerError to the process select element
									$('#ServiceID').addClass('ServerError');
									// Set a custom error message to the proccess select element
									$('#ProcessEntityIDServerError').children().first().text(ErrorMessage);
								}

								Core.Form.Validate.Init();

								// Register event for tree selection dialog
								Core.UI.TreeSelection.InitTreeSelection();

								// move help triggers into field rows for dynamic fields
								$('.Row > .FieldHelpContainer').each(function () {
									if (!$(this).next('label').find('.Marker').length) {
										$(this).prependTo($(this).next('label'));
									} else {
										$(this).insertAfter($(this).next('label').find('.Marker'));
									}
								});

								// Initially display dynamic fields with TreeMode = 1 correctly
								Core.UI.TreeSelection.InitDynamicFieldTreeViewRestore();

								// trigger again a responsive event
								if (Core.App.Responsive.IsSmallerOrEqual(Core.App.Responsive.GetScreenSize(), 'ScreenL')) {
									Core.App.Publish('Event.App.Responsive.SmallerOrEqualScreenL');
								}

								$('#AJAXLoader').addClass('Hidden');
								$('#AJAXDialog').val('1');

								// Set pre loaded field values
								// TODO: Put this block above together with other data processing, before
								// adding the fields to the DOM
								jQuery.each( Core.Agent.DynamicFieldByServicePreLoad, function( oKey, oObj ) {
									if (oKey == 'Message' && oObj.value.length) {
										window.CKEDITOR.instances['RichText'].on('instanceReady', function() { 
											window.CKEDITOR.instances['RichText'].setData(oObj.value);
										});
										// @TODO: check if instances is already ready instead of
										// just triggering the funciton bellow.
										// The following line is needed because when the service is changed
										// the code above is not triggered since 'instanceReady' will not be
										// triggered again.
										window.CKEDITOR.instances['RichText'].setData(oObj.value);
									} else {
										$( '#' + oKey ).val( oObj.value ).attr('class',oObj.attr);
									}
								});
								Core.Agent.DynamicFieldByServicePreLoad = {};

								// Add change event listener on each of those fields, in order to trigger 
								// FormUpdate (probably to process ACLs)
								$(".AddDFS").each(function () {
									if ($(this).hasClass('DateSelection') || $(this).hasClass('Validate_MaxLength')) {
										return true;
									}
									var formId = {};
									var id = $(this).attr('id');

									var formID = "";
									$("form").each(function () {
										if ($(this).attr("name") == "compose") {
											formID = $(this).attr("id");
										}
									});

									var $inputs = $('#' + formID + ' :input');


									var ids = [];

									$inputs.each(function (index) {
										if (typeof $(this).attr('id') != 'undefined' &&
											typeof $(this).attr('name') != 'undefined') {
											ids.push($(this).attr('id'));
										}
									});
									var index = ids.indexOf('FileUpload');
									if (index !== -1) ids.splice(index, 1);

									$('#' + id).bind('change', function (Event) {
										Core.AJAX.FormUpdate($(this).parents('form'), 'AJAXUpdate', id, ids);
									});
									Core.App.Subscribe('Event.AJAX.FormUpdate.Callback', function (Data) {
										var FieldName = id;
										if (Data[FieldName] && $('#' + FieldName).hasClass('DynamicFieldWithTreeView')) {
											Core.UI.TreeSelection.RestoreDynamicFieldTreeView($('#' + FieldName), Data[FieldName], '', 1);
										}
									});
								});
								// Core.Agent.DynamicFieldByService.Init();
							} else {
								$('#AJAXLoader').addClass('Hidden');
							}
						}, 'html');

				} else {
					// If no service was selected, then clean Form Fields from the last selected service
					$('.AddDFS').each(function () {
						var $that = $(this);
						$($that).parent().parent().fadeOut(400, function () {
							$($that).parent().parent().empty();
						});
					});
					var arrayFieldsClean = reloadFields.split(',');
					var i;
					for (i = 0; i < arrayFieldsClean.length; i++) {
						if (arrayFieldsClean[i] === "Message") {
							window.CKEDITOR.instances['RichText'].setData('');
						} else if ($('#' + arrayFieldsClean[i]).length > 0) {
							$('#' + arrayFieldsClean[i]).val('');
						}
					}

					Core.AJAX.FormUpdate($('#' + formID), 'AJAXUpdate', 'ServiceID', [reloadFields]);
					$('#Subject').parent().show();
					$('.RichTextHolder').show();
					$('.DnDUploadBox').parent().parent().show();
					$('#AJAXLoaderSubject\\,Message').hide();
				}

				return false;
			}).attr('data-ligeroform', 'ok');
			// Incluimos o atributo data-ligeroform acima para evitar loop no bind change do objeto
		});


//// ======================================== breaking point ================================================================
		// Alteração de outros campos que não seja, o campo serviço! #################################################################################
		// Campos Dinamicos
		$("[id^='DynamicField_'][data-ligeroform!='ok']").each(function () {
			$(this).bind('change', function () {
				var formID = "";
				$("form").each(function () {
					if ($(this).attr("name") == "compose") {
						formID = $(this).attr("id");
					}

				});
				// Prepara os dados para envio
				var Data = {};
				if (!Core.Config.Get('SessionIDCookie')) {
					Data[Core.Config.Get('SessionName')] = Core.Config.Get('SessionID');
					Data[Core.Config.Get('CustomerPanelSessionName')] = Core.Config.Get('SessionID');
				}
				Data.ChallengeToken = Core.Config.Get('ChallengeToken');
				Data.Action = 'DynamicFieldByService';
				Data.Subaction = 'HideAndShowDynamicFields';
				Data.InterfaceName = formID;
				Data.IsAjaxRequest = 1;
				Data.IsMainWindow = 1;
				var QueryString = '';
				$.each(Data, function (Key, Value) {
					QueryString += ';' + encodeURIComponent(Key) + '=' + encodeURIComponent(Value);
				});
				QueryString = Core.AJAX.SerializeForm($('#' + formID), Data) + QueryString;

				// show loader icon
				$('#AJAXLoader').removeClass('Hidden');
				// get new ActivityDialog content
				var uploadFields = {};
				Core.AJAX.FunctionCall(
					Core.Config.Get('CGIHandle'),
					QueryString,
					function (Response) {
						if (Response == 0) {
							return;
						}
						$('.AddDFS').each(function () {
							var $that = $(this);
							if ($that.is(':file'))
								uploadFields[ $that.attr('id') ] = $that.clone();
							$($that).parent().parent().remove();
						});

						var res = Response.split(':$$:Add:$$:');
						//LOOP QUE PEGA OS VALORES E OS NOMES 
						Response = res[0];
						var i;
						arrayJSON = res[1].split('@%@%@');
						objectJSON;
						reloadFields = "";
						var AgentFieldConfigInsert = ".SpacingTop:first";
						var CustomerFieldConfigInsert = "#BottomActionRow";
						//var valObj = ["Dest","StateID","SLAID","TypeID"];
						for (i = 0; i < arrayJSON.length; i++) {
							objectJSON = $.parseJSON(arrayJSON[i]);
							$.each(objectJSON, function (key, val) {
								if (key && val) {
									if (key === "Message") {
										setTimeout( function() {
											window.CKEDITOR.instances['RichText'].setData(val);
										},5000);
										reloadFields += "" + key + ",";
									} else if (key === "AgentFieldConfig") {
										AgentFieldConfigInsert = "" + val + "";
									} else if ($('#' + key).length > 0) {
										reloadFields += "" + key + ",";
										$('#' + key).val(val);
										Core.UI.InputFields.Deactivate($('#' + key));
										Core.UI.InputFields.Activate($('#' + key));

									}
									if (key === "CustomerFieldConfig") {
										CustomerFieldConfigInsert = "" + val + "";
									}
								}

							});
						}
						reloadFields = reloadFields.substring(0, reloadFields.length - 1);
						//Core.AJAX.FormUpdate($('#'+formID), 'AJAXUpdate', 'ServiceID', [reloadFields]);
						var FieldConfigInsert = "";
						if (formID === "NewCustomerTicket") {
							FieldConfigInsert = CustomerFieldConfigInsert;
						} else {
							FieldConfigInsert = AgentFieldConfigInsert;
						}

						var $ElementToUpdate = $(Response).insertBefore(FieldConfigInsert),
							JavaScriptString = '',
							ErrorMessage;


						Object.keys( uploadFields ).forEach( function(i,v) {
							$("#"+i).replaceWith( uploadFields[i] );
						});

						////////////////////////////////////////////////////////
						Core.UI.InputFields.Deactivate();
						Core.UI.InputFields.Activate();
						//////////////////////////////////////////////////
						if (!Response) {
							$('#AJAXLoader').addClass('Hidden');
						} else if ($ElementToUpdate && isJQueryObject($ElementToUpdate) && $ElementToUpdate.length) {
							$ElementToUpdate.find('script').each(function () {
								JavaScriptString += $(this).html();
								$(this).remove();
							});

							$ElementToUpdate.fadeIn();
							Core.UI.InputFields.Activate($ElementToUpdate);
							try {
								/*eslint-disable no-eval */
								eval(JavaScriptString);
								/*eslint-enable no-eval */
							} catch (Event) {
								// do nothing here (code needed  to not have an empty block here)
								$.noop(Event);
							}

							// Handle special server errors (Response = <div class="ServerError" data-message="Message"></div>)
							// Check if first element has class 'ServerError'
							if ($ElementToUpdate.children().first().hasClass('ServerError')) {
								ErrorMessage = $ElementToUpdate.children().first().data('message');

								// Add class ServerError to the process select element
								$('#ServiceID').addClass('ServerError');
								// Set a custom error message to the proccess select element
								$('#ProcessEntityIDServerError').children().first().text(ErrorMessage);
							}

							Core.Form.Validate.Init();

							// Register event for tree selection dialog
							Core.UI.TreeSelection.InitTreeSelection();

							// move help triggers into field rows for dynamic fields
							$('.Row > .FieldHelpContainer').each(function () {
								if (!$(this).next('label').find('.Marker').length) {
									$(this).prependTo($(this).next('label'));
								} else {
									$(this).insertAfter($(this).next('label').find('.Marker'));
								}
							});

							// Initially display dynamic fields with TreeMode = 1 correctly
							Core.UI.TreeSelection.InitDynamicFieldTreeViewRestore();

							// trigger again a responsive event
							if (Core.App.Responsive.IsSmallerOrEqual(Core.App.Responsive.GetScreenSize(), 'ScreenL')) {
								Core.App.Publish('Event.App.Responsive.SmallerOrEqualScreenL');
							}

							$('#AJAXLoader').addClass('Hidden');
							$('#AJAXDialog').val('1');

							$(".AddDFS").each(function () {

								// clean old fields not rendered via ajax ( ugly as f*** )
								$('#' + $(this).attr('id')).not('.AddDFS').each(function() {
									var $that = $(this);
									$($that).parent().parent().remove();
								});

								if ($(this).hasClass('DateSelection') || $(this).hasClass('Validate_MaxLength')) {
									return true;
								}

								var formId = {};
								var id = $(this).attr('id');

								var formID = "";
								$("form").each(function () {
									if ($(this).attr("name") == "compose") {
										formID = $(this).attr("id");
									}
								});

								var $inputs = $('#' + formID + ' :input');


								var ids = [];

								$inputs.each(function (index) {
									if (typeof $(this).attr('id') != 'undefined' &&
										typeof $(this).attr('name') != 'undefined') {
										ids.push($(this).attr('id'));
									}
								});
								var index = ids.indexOf('FileUpload');
								if (index !== -1) ids.splice(index, 1);


								$('#' + id).bind('change', function (Event) {
									Core.AJAX.FormUpdate($(this).parents('form'), 'AJAXUpdate', id, ids);
								});
								Core.App.Subscribe('Event.AJAX.FormUpdate.Callback', function (Data) {
									var FieldName = id;
									if (Data[FieldName] && $('#' + FieldName).hasClass('DynamicFieldWithTreeView')) {
										Core.UI.TreeSelection.RestoreDynamicFieldTreeView($('#' + FieldName), Data[FieldName], '', 1);
									}
								});
							});
							// Core.Agent.DynamicFieldByService.Init();
						} else {
							$('#AJAXLoader').addClass('Hidden');
						}
						if (Core.Agent.DynamicFieldByServiceLastFocus) {
							$('#' + Core.Agent.DynamicFieldByServiceLastFocus).focus();
						}
					}, 'html');
				return false;
			}).bind('focus',function(e) {
				if (e.target.attributes.getNamedItem('role') === null)
					Core.Agent.DynamicFieldByServiceLastFocus = e.target.id;
			}).attr('data-ligeroform', 'ok');
			// Incluimos o atributo data-ligeroform acima para evitar loop no bind change do objeto
		});
	};

	return TargetNS;
}(Core.Agent.DynamicFieldByService || {}));
