# --
# Copyright (C) 2001-2015 OTRS AG, http://otrs.com/
# --
# This software comes with ABSOLUTELY NO WARRANTY. For details, see
# the enclosed file COPYING for license information (AGPL). If you
# did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
# --

package Kernel::Modules::ServiceForms;

use strict;
use warnings;

use utf8;

our $ObjectManagerDisabled = 1;

sub new {
	my ( $Type, %Param ) = @_;
	
    # allocate new hash for object
    my $Self = {%Param};
    bless( $Self, $Type );
	

    my $Action = $Self->{Action}||'';
    
    # Para execução caso não seja uma das telas abaixo
    if ($Action !~ /(AgentTicketPhone|AgentTicketEmail|CustomerTicketMessage)/ ){
        return $Self;
    }

    my $DfByServiceObject = $Kernel::OM->Get('Kernel::System::DynamicFieldByService');
    # Verifica se há o parametro ServiceID
    my $ServiceID  = $Kernel::OM->Get('Kernel::System::Web::Request')->GetParam( Param => 'ServiceID' ) || '';
	my $Subaction = $Self->{Subaction} || '';	    
	 
    # Para execução se não houver ServiceID
    if($ServiceID eq '' or $Subaction eq ''){
        return $Self;
    }
    my $DynamicFieldsByService = $DfByServiceObject->GetDynamicFieldByService(ServiceID => $ServiceID);
    my %HashDosCampos;

    # COMPLEMENTO: 16-05-06
    if ($DynamicFieldsByService->{Config}){
	    DIALOGFIELD:
		    for my $CurrentField ( @{ $DynamicFieldsByService->{Config}{FieldOrder} } ) {
			    my %FieldData = %{ $DynamicFieldsByService->{Config}{Fields}{$CurrentField} };

			    next DIALOGFIELD if !$FieldData{Display};
	
	       	    # render DynamicFields
	            if ( $CurrentField =~ m{^DynamicField_(.*)}xms ) {
           	    	my $DynamicFieldName = $1;
				    $HashDosCampos{$DynamicFieldName} = $FieldData{Display}; 	
           		}
	    }
    }
    return $Self if(!%HashDosCampos);
    my $ConfigObject = $Kernel::OM->Get('Kernel::Config');   
	my $HashOld = $ConfigObject->Get("Ticket::Frontend::$Action"); 
	foreach my $Keys (keys %{$HashOld->{DynamicField}}){
		$HashDosCampos{$Keys} = $HashOld->{DynamicField}{$Keys};
	}
    # Exemplo:
    # Altera o valor dos campos
    $ConfigObject->Set(
        Key   => "Ticket::Frontend::$Action###DynamicField",
        Value => \%HashDosCampos
    );

    return $Self;
}

sub PreRun {
    my ( $Self, %Param ) = @_;
    return;
}

sub Run {
    my ( $Self, %Param ) = @_;
    return;

}

1;
