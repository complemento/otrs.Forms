# --
# --
# This software comes with ABSOLUTELY NO WARRANTY. For details, see
# the enclosed file COPYING for license information (AGPL). If you
# did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
# --

package Kernel::Output::HTML::OutputFilterLigeroForms;

use strict;
use warnings;
use utf8;

use List::Util qw(first);
use HTTP::Status qw(:constants :is status_message);

sub new {

	my ( $Type, %Param ) = @_;
	my $Self = {};
	bless( $Self, $Type );
	return $Self;

}

sub Run {

	my ( $Self, %Param ) = @_;
	my %Data = ();
	my $LayoutObject = $Kernel::OM->Get('Kernel::Output::HTML::Layout');
	my $Stream = $LayoutObject->Output(
		TemplateFile => 'LigeroForms',
		Data         => \%Data,
	);
	#${ $Param{Data} } .= $Stream;
 
}
1;
