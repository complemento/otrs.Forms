// --
// Copyright (C) 2001-2015 OTRS AG, http://otrs.com/
// --
// This software comes with ABSOLUTELY NO WARRANTY. For details, see
// the enclosed file COPYING for license information (AGPL). If you
// did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
// --

"use strict";

var Core = Core || {};
Core.Agent = Core.Agent || {};

/**
 * @namespace Core.Agent.TicketProcess
 * @memberof Core.Agent
 * @author OTRS AG
 * @description
 *      This namespace contains the special module functions for TicketProcess.
 */
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

        $('#ServiceID').bind('change', function () {
			
			var formID ="";
			 $("form").each(function(){
				if($(this).attr("name") == "compose"){ 
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
				$('.ComplementoDFS').each(function(){
					var $that =  $(this);
	                	$($that).parent().parent().fadeOut(400, function() {
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
					if(Response == 0){
						return;
					}
					var res = Response.split(':$$:Ligero:$$:');
					//LOOP QUE PEGA OS VALORES E OS NOMES 
						Response = res[0];
						var i;
						arrayJSON = res[1].split(',');
						objectJSON;
						reloadFields = "";
						var AgentFieldConfigInsert  = ".SpacingTop:first";
						var CustomerFieldConfigInsert = "#BottomActionRow";
						for( i=0; i < arrayJSON.length; i++){
							objectJSON = $.parseJSON(arrayJSON[i]);
							$.each( objectJSON, function( key, val ) {
								  if(key && val){
									if(key === "Message"){
										window.CKEDITOR.instances['RichText'].setData(val);
									    reloadFields += ""+key+",";
									}else if(key === "AgentFieldConfig"){
										AgentFieldConfigInsert = ""+val+"";
									}
									else if($('#'+key).size() > 0){
										$('#'+key).val(val);	
										reloadFields += ""+key+",";
									}
									if(key === "CustomerFieldConfig"){
										CustomerFieldConfigInsert =  ""+val+"";
									}	
								  }	

  							});
						}
						reloadFields = reloadFields.substring(0,reloadFields.length - 1);
						Core.AJAX.FormUpdate($('#'+formID), 'AJAXUpdate', 'ServiceID', [reloadFields]);
						var FieldConfigInsert = "";
						if(formID === "NewCustomerTicket"){
							FieldConfigInsert = CustomerFieldConfigInsert;
//							alert(CustomerFieldConfigInsert);
						}else{
							 FieldConfigInsert =  AgentFieldConfigInsert;
						} 	
					
        	           	var $ElementToUpdate = $(Response).insertBefore(FieldConfigInsert),
        	            JavaScriptString = '',
        	            ErrorMessage;

                    if (!Response) {

                        // We are out of the OTRS App scope, that's why an exception would not be caught. Therefor we handle the error manually.
//                        Core.Exception.HandleFinalError(new Core.Exception.ApplicationError("No content received.", 'CommunicationError'));
                        $('#AJAXLoader').addClass('Hidden');
                    }
                    else if ($ElementToUpdate && isJQueryObject($ElementToUpdate) && $ElementToUpdate.length) {
                        $ElementToUpdate.find('script').each(function() {
                            JavaScriptString += $(this).html();
                            $(this).remove();
                        });

                        $ElementToUpdate.fadeIn();
                        Core.UI.InputFields.Activate($ElementToUpdate);
                        try {
                            /*eslint-disable no-eval */
                            eval(JavaScriptString);
                            /*eslint-enable no-eval */
                        }
                        catch (Event) {
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
                            }
                            else {
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

                    }
                    else {

                        // We are out of the OTRS App scope, that's why an exception would not be caught. Therefor we handle the error manually.
//                        Core.Exception.HandleFinalError(new Core.Exception.ApplicationError("No such element id: " + $ElementToUpdate.attr('id') + " in page!", 'CommunicationError'));
                        $('#AJAXLoader').addClass('Hidden');
                    }
                }, 'html');

            }
            else {
				$('.ComplementoDFS').each(function(){
					var $that =  $(this);
	                	$($that).parent().parent().fadeOut(400, function() {
		       	            $($that).parent().parent().empty();
	        		});
				});
				var arrayFieldsClean = reloadFields.split(',');
				var i;
				for( i=0; i < arrayFieldsClean.length; i++){
					if(arrayFieldsClean[i] === "Message"){
						window.CKEDITOR.instances['RichText'].setData('');
					}
					else if($('#'+ arrayFieldsClean[i]).size() > 0){
						 $('#'+arrayFieldsClean[i]).val('');	
					}

				}

					Core.AJAX.FormUpdate($('#'+formID), 'AJAXUpdate', 'ServiceID', [reloadFields]);
            }
			
            return false;
        });
    };

    return TargetNS;
}(Core.Agent.DynamicFieldByService || {}));
