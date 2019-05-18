// --
// --
// This software comes with ABSOLUTELY NO WARRANTY. For details, see
// the enclosed file COPYING for license information (AGPL). If you
// did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
// --

"use strict";

var Core = Core || {};
Core.Agent = Core.Agent || {};

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

		var reloadFields = "";
		if ($('[data-ligeroform=ok]').length == 0 && $("[name=Action]").val() == "CustomerTicketMessage" && $("#ServiceID").val() != "") {
			setTimeout(function () {
				$('#ServiceID').trigger("change");
			}, 1);
		}
		// Monitora a mudança do campo Serviço e dos campos dinamicos
		$("#ServiceID[data-ligeroform!='ok']").each(function () {
			$(this).bind('change', function () {
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
					InterfaceName: formID,
					IsAjaxRequest: 1,
					IsMainWindow: 1
				};
				if ($('#IsProcessEnroll').val() !== 'undefined' && $('#IsProcessEnroll').val() === '1') {
					$.extend(Data, {
						IsMainWindow: 1,
						IsProcessEnroll: 1,
						TicketID: $('#TicketID').val()
					});
				}
				if ($('#ServiceID').val()) {
					$('.AddDFS').each(function () {
						var $that = $(this);
						$($that).parent().parent().fadeOut(400, function () {
							$($that).parent().parent().empty();
						});
					});
					// remove the content of the activity dialog
					$('#ActivityDialogContent').empty();

					// fade out the empty container so it will fade in again on processes change
					// is not recommended to empty after fade out at this point since the transition offect
					// will not look so nice
					$('#ActivityDialogContent').fadeOut('fast');

					// show loader icon
					$('#AJAXLoader').removeClass('Hidden');
					// get new ActivityDialog content
					Core.AJAX.FunctionCall(
						Core.Config.Get('CGIHandle'),
						Data,
						function (Response) {
							if (Response == 0) {
								return;
							}
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

								Core.Agent.DynamicFieldByService.Init();


							} else {
								//                        Core.Exception.HandleFinalError(new Core.Exception.ApplicationError("No such element id: " + $ElementToUpdate.attr('id') + " in page!", 'CommunicationError'));
								$('#AJAXLoader').addClass('Hidden');
							}
						}, 'html');

				} else {
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
				// ServiceDynamicID: $('#ServiceID').val(),
				Data.InterfaceName = formID;
				Data.IsAjaxRequest = 1;
				Data.IsMainWindow = 1;
				var QueryString = '';
				$.each(Data, function (Key, Value) {
					QueryString += ';' + encodeURIComponent(Key) + '=' + encodeURIComponent(Value);
				});
				QueryString = Core.AJAX.SerializeForm($('#' + formID), Data) + QueryString;

				if ($('#IsProcessEnroll').val() !== 'undefined' && $('#IsProcessEnroll').val() === '1') {
					$.extend(Data, {
						IsMainWindow: 1,
						IsProcessEnroll: 1,
						TicketID: $('#TicketID').val()
					});
				}
				// if ($('#ServiceID').val()) {
				// Aqui limpamos os campos, então esta não é a ideia aqui
				// $('.AddDFS').each(function(){
				// 	var $that =  $(this);
				// 		$($that).parent().parent().fadeOut(400, function() {
				// 				$($that).parent().parent().empty();
				// 	});
				// });
				// remove the content of the activity dialog
				// $('#ActivityDialogContent').empty();

				// fade out the empty container so it will fade in again on processes change
				// is not recommended to empty after fade out at this point since the transition offect
				// will not look so nice
				// $('#ActivityDialogContent').fadeOut('fast');

				// show loader icon
				$('#AJAXLoader').removeClass('Hidden');
				// get new ActivityDialog content
				Core.AJAX.FunctionCall(
					Core.Config.Get('CGIHandle'),
					QueryString,
					function (Response) {
						if (Response == 0) {
							return;
						}

						// Aqui limpamos os campos, então esta não é a ideia aqui
						$('.AddDFS').each(function () {
							var $that = $(this);
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
										window.CKEDITOR.instances['RichText'].setData(val);
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

							Core.Agent.DynamicFieldByService.Init();


						} else {
							//                        Core.Exception.HandleFinalError(new Core.Exception.ApplicationError("No such element id: " + $ElementToUpdate.attr('id') + " in page!", 'CommunicationError'));
							$('#AJAXLoader').addClass('Hidden');
						}
					}, 'html');

				// }
				// else {
				// 	$('.AddDFS').each(function(){
				// 		var $that =  $(this);
				// 			$($that).parent().parent().fadeOut(400, function() {
				// 				   $($that).parent().parent().empty();
				// 		});
				// 	});
				// 	var arrayFieldsClean = reloadFields.split(',');
				// 	var i;
				// 	for( i=0; i < arrayFieldsClean.length; i++){
				// 		if(arrayFieldsClean[i] === "Message"){
				// 			window.CKEDITOR.instances['RichText'].setData('');
				// 		}
				// 		else if($('#'+ arrayFieldsClean[i]).length > 0){
				// 			 $('#'+arrayFieldsClean[i]).val('');	
				// 		}

				// 	}

				// 		Core.AJAX.FormUpdate($('#'+formID), 'AJAXUpdate', 'ServiceID', [reloadFields]);

				// }

				return false;
			}).attr('data-ligeroform', 'ok');
			// Incluimos o atributo data-ligeroform acima para evitar loop no bind change do objeto
		});
	};

	return TargetNS;
}(Core.Agent.DynamicFieldByService || {}));
