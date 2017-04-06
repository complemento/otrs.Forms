# --
# This software comes with ABSOLUTELY NO WARRANTY. For details, see
# the enclosed file COPYING for license information (AGPL). If you
# did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
# --

package var::packagesetup::ComplementoDynamicFieldByService;

use strict;
use warnings;

use Kernel::Output::Template::Provider;

our @ObjectDependencies = (
    'Kernel::Config',
    'Kernel::System::DB',
    'Kernel::System::DynamicField',
    'Kernel::System::Log',
    'Kernel::System::State',
    'Kernel::System::Stats',
    'Kernel::System::SysConfig',
    'Kernel::System::Type',
    'Kernel::System::Valid',
);

sub new {
    my ( $Type, %Param ) = @_;

    # allocate new hash for object
    my $Self = {};
    bless( $Self, $Type );

    return $Self;
}


sub CodeInstall {
    my ( $Self, %Param ) = @_;

    $Self->_SetNewLoaders();
    
    return 1;
}

sub CodeUpgrade {
    my ( $Self, %Param ) = @_;

    $Self->_SetNewLoaders();
	
    return 1;
}
sub CodeUninstall {	
	my ( $Self, %Param ) = @_;
	$Self->_RemoveLoaderJS();
	return 1;
}
sub _RemoveLoaderJS{
    my ( $Self, %Param ) = @_;
	my $ConfigObject = $Kernel::OM->Get('Kernel::Config');
	my $FrontEndValue = $ConfigObject->Get('Frontend::Module') ; 
	my $UninstallLoader = 'Core.Agent.DynamicFieldByService.js';
    for(qw(AgentTicketEmail AgentTicketPhone)){
		my $Interface = $_;
		for ( my $index = $#{$FrontEndValue->{$Interface}->{Loader}{JavaScript}}; $index >= 0; --$index ){
			splice $FrontEndValue->{$Interface}->{Loader}{JavaScript}, $index, 1
		    if $FrontEndValue->{$Interface}->{Loader}{JavaScript}[$index] =~ /Core\.Agent\.DynamicFieldByService\.js/;  # remove certain elements
		}

        my $Success = $Kernel::OM->Get('Kernel::System::SysConfig')->ConfigItemUpdate(
            Valid => 1,
            Key   => 'Frontend::Module###' . $_ ,
            Value => $FrontEndValue->{$_},
    
        ); 
    }

    my $CustomerFrontEnd = $ConfigObject->Get('CustomerFrontend::Module');
	if(exists $CustomerFrontEnd->{CustomerTicketMessage}->{Loader}){
		for ( my $index = $#{$CustomerFrontEnd->{CustomerTicketMessage}->{Loader}{JavaScript}}; $index >= 0; --$index ){
			splice $CustomerFrontEnd->{CustomerTicketMessage}->{Loader}{JavaScript}, $index, 1
		    if $CustomerFrontEnd->{CustomerTicketMessage}->{Loader}{JavaScript}[$index] =~ /Core\.Agent\.DynamicFieldByService\.js/;  # remove certain elements
		}
	
		my $Success = $Kernel::OM->Get('Kernel::System::SysConfig')->ConfigItemUpdate(
	     	Valid => 1,
	        Key   => 'CustomerFrontend::Module###CustomerTicketMessage',
    	   	Value => $CustomerFrontEnd->{CustomerTicketMessage},
	
   	);
	}
    return 1;


}
sub _SetNewLoaders {
    my ( $Self, %Param ) = @_;

	my $ConfigObject = $Kernel::OM->Get('Kernel::Config');
	my $FrontEndValue = $ConfigObject->Get('Frontend::Module') ; 
    for(qw(AgentTicketEmail AgentTicketPhone)){
        push($FrontEndValue->{$_}->{Loader}{JavaScript},'Core.Agent.DynamicFieldByService.js');


        my $Success = $Kernel::OM->Get('Kernel::System::SysConfig')->ConfigItemUpdate(
            Valid => 1,
            Key   => 'Frontend::Module###' . $_ ,
            Value => $FrontEndValue->{$_},
    
        ); 
    }

    my $CustomerFrontEnd = $ConfigObject->Get('CustomerFrontend::Module');
	if(!exists $CustomerFrontEnd->{CustomerTicketMessage}->{Loader}){
		$CustomerFrontEnd->{CustomerTicketMessage}{"Loader"} = { 'JavaScript' => [ 'Core.Agent.DynamicFieldByService.js']};
	}else{
		push($CustomerFrontEnd->{CustomerTicketMessage}->{Loader}{JavaScript},'Core.Agent.DynamicFieldByService.js');
	}
	my $Success = $Kernel::OM->Get('Kernel::System::SysConfig')->ConfigItemUpdate(
     	Valid => 1,
        Key   => 'CustomerFrontend::Module###CustomerTicketMessage',
       	Value => $CustomerFrontEnd->{CustomerTicketMessage},

    );

    return 1;
}




