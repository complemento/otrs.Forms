# --
# This software comes with ABSOLUTELY NO WARRANTY. For details, see
# the enclosed file COPYING for license information (AGPL). If you
# did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
# --

package Kernel::Modules::LigeroForms;

use utf8;
use strict;
use warnings;
use vars qw($VERSION);

use Encode qw();
use Data::Dumper;
use Kernel::System::VariableCheck qw(:all);

sub new {
    my ( $Type, %Param ) = @_;

    # allocate new hash for object
    my $Self = {%Param};
    bless( $Self, $Type );
    return $Self;

}

sub Run {
	my ( $Self, %Param ) = @_;
	return $Self->_Load() if ( $Self->{Subaction} eq 'Load' );
}

sub _Load {

	my ( $Self, %Param ) = @_;

	my $DynamicFieldBackendObject = $Kernel::OM->Get('Kernel::System::DynamicField::Backend');
	my $DfByServiceObject         = $Kernel::OM->Get('Kernel::System::DynamicFieldByService');
	my $ParamObject               = $Kernel::OM->Get('Kernel::System::Web::Request');
	my $LayoutObject              = $Kernel::OM->Get('Kernel::Output::HTML::Layout');
	my $TemplateGeneratorObject   = $Kernel::OM->Get('Kernel::System::TemplateGenerator');

	my $ServiceID         = $ParamObject->GetParam( Param => 'ServiceID' );
	my $FormConfig        = $DfByServiceObject->GetDynamicFieldByService( ServiceID => $ServiceID );
	return $Self->_Output({}) if(!$FormConfig->{ID});

	# Create retur
	my $Return = { Form => $FormConfig, Fields => () };

	# Loop through form config
	if (ref ($FormConfig->{Config}) eq 'HASH') {

		my $DynamicField = $Kernel::OM->Get('Kernel::System::DynamicField')->DynamicFieldListGet(
			Valid      => 1,
			ObjectType => ['Ticket', 'Article'],
		);
		for my $CurrentField ( @{ $FormConfig->{Config}{FieldOrder} } ) {

			# Field config data
			my %FieldData = %{ $FormConfig->{Config}{Fields}{$CurrentField} };
			my $FieldContent;

			# Parse dynamic fields
			if ( $CurrentField =~ m{^DynamicField_(.*)}xms ) {

				my $DynamicFieldName = $1;
				my $DynamicFieldConfig = ( grep { $_->{Name} eq $DynamicFieldName } @{$DynamicField} )[0];
				my $PossibleValues = $DynamicFieldBackendObject->PossibleValuesGet(
					DynamicFieldConfig => $DynamicFieldConfig
				);

				my $FieldRawObject = $DynamicFieldBackendObject->EditFieldRender(
					DynamicFieldConfig   => $DynamicFieldConfig,
					ParamObject          => $ParamObject,
					LayoutObject         => $LayoutObject,
					Class                => 'AddDFS' # (@TODO check if this class is really necessary)
				);
				my %Data = (
					Name    => $DynamicFieldConfig->{Name},
					Label   => $FieldRawObject->{Label},
					Content => $FieldRawObject->{Field},
				);
				$LayoutObject->Block(
					Name => 'rw:DynamicField',
					Data => \%Data
				);
				$FieldContent = $LayoutObject->Output( TemplateFile => 'ProcessManagement/DynamicField' );

			}

			push @{ $Return->{Fields} }, {
				Name    => $CurrentField,
				Config  => \%FieldData,
				Content => $FieldContent
			};
		}
	}

	return $Self->_Output( $Return );

}

sub _Output {

	my ( $Self, $Stream ) = @_;
	my $LayoutObject      = $Kernel::OM->Get('Kernel::Output::HTML::Layout');
	my $JSONObject        = $Kernel::OM->Get('Kernel::System::JSON');
	return $LayoutObject->Attachment(
		ContentType => 'text/html; charset=' . $LayoutObject->{Charset},
		Content     => $JSONObject->Encode( Data => $Stream, Pretty => 1 ),
		Type        => 'inline',
		NoCache     => 1,
	);

}

1;
