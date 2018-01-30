# --
# --
# This software comes with ABSOLUTELY NO WARRANTY. For details, see
# the enclosed file COPYING for license information (AGPL). If you
# did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
# --

package Kernel::Output::HTML::OutputFilterDynamicFieldByService;

use strict;
use warnings;
use utf8;

use List::Util qw(first);
use HTTP::Status qw(:constants :is status_message);
use Kernel::System::Encode;
use Kernel::System::DB;
use Kernel::System::CustomerUser;
use Kernel::System::CustomerCompany;

sub new {
    my ( $Type, %Param ) = @_;

    # allocate new hash for object
    my $Self = {};
    bless( $Self, $Type );

    # get needed objects

    $Self->{UserID} = $Param{UserID};
	$Self->{DynamicFieldBackend} =  $Kernel::OM->Get('Kernel::System::DynamicField::Backend');
	$Self->{DynamicField} =  $Kernel::OM->Get('Kernel::System::DynamicField');
	$Self->{CustomerUserObject}  = $Kernel::OM->Get('Kernel::System::CustomerUser');
	$Self->{CustomerCompanyObject} = $Kernel::OM->Get('Kernel::System::CustomerCompany');

    return $Self;
}

sub Run {
    my ( $Self, %Param ) = @_;
	my %Data = ();

    my $ParamObject = $Kernel::OM->Get('Kernel::System::Web::Request');
    my $ConfigObject = $Kernel::OM->Get('Kernel::Config');
    my $LayoutObject = $Kernel::OM->Get('Kernel::Output::HTML::Layout');

    # Check if it's upload
    # get upload cache object
    my $ParamObject = $Kernel::OM->Get('Kernel::System::Web::Request');
    
    # If is an action about attachments
    my $IsUpload = 0;
    # attachment delete
    my @AttachmentIDs = map {
        my ($ID) = $_ =~ m{ \A AttachmentDelete (\d+) \z }xms;
        $ID ? $ID : ();
    } $ParamObject->GetParamNames();
    COUNT:
    for my $Count ( reverse sort @AttachmentIDs ) {
        my $Delete = $ParamObject->GetParam( Param => "AttachmentDelete$Count" );
        next COUNT if !$Delete;
        $IsUpload = 1;
    }
    # attachment upload
    if ( $ParamObject->GetParam( Param => 'AttachmentUpload' ) ) {
        $IsUpload                = 1;
    }
    if($IsUpload){
        $Kernel::OM->Get('Kernel::Output::HTML::Layout')->Block(
            Name => 'IsUpload',
            Data => {},
        );
    }


    # get template name
    my $userID = $Self->{UserID};
	my %InformationCustomer =	 $Self->{CustomerUserObject}->CustomerUserDataGet(
       User => $userID,
    );
	my $FieldName = $ConfigObject->Get( 'AT::FieldName');
    my $TextTemplate = $ConfigObject->Get( 'AT::TextTemplate');
 	

	 $Data{FieldName} = $FieldName;
	 $Data{TextTemplate} = $TextTemplate;
	   # Mostra widget central com iframe da pagina
		my $iFrame = $LayoutObject->Output(
    	    TemplateFile => 'ShowDynamicFieldByService',
	        Data         => \%Data,
    	);
	   ${ $Param{Data} } .= $iFrame ;
 
}
1;

