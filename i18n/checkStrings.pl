#!/usr/bin/perl
# Check all strings in code and HTML are reflected in en.json
# This is only for use by developers.
# Translators should use ../js/i18n/checkTranslation.js to check
# the translations match en.json
use strict;
use utf8;
use Path::Tiny;
use JSON;

my %found;

# LOAD HTML
my $htmld;
opendir($htmld, "../html");
foreach my $html (grep { /\.html$/ } readdir($htmld)) {
	my $data = path("../html/$html")->slurp();
	while ($data =~ /data-i18n(?:|-placeholder|-tooltip)=(["'])(.*?)\1/g) {
		push(@{$found{$2}}, $html);
	}
}
closedir($htmld);

# LOAD JS
foreach my $dir ("../js/browser", "../js/game", "../js/server") {
	my $jsd;
	opendir($jsd, $dir);
	foreach my $js (grep { /\.js$/ } readdir($jsd)) {
		my $data = path("$dir/$js")->slurp();
		$data =~ s/[\r\n]+/ /g;
		while ($data =~ /\.i18n\s*\(\s*(["'])(.*?)\1/g) {
			push(@{$found{$2}}, $js);
		}
		while ($data =~ /\/\*i18n(?: ([-\w]*?))?\*\/\s*(["'])(.*?)\2/g) {
			my $key = ($1 || '') . $3;
			push(@{$found{$key}}, $js);
		}
	}
	closedir($jsd);
}

# LOAD STRINGS
my $i18nd;
my %strings;
opendir($i18nd, ".");
foreach my $json (grep { /\.json$/ } readdir($i18nd)) {
	my $data = decode_json path($json)->slurp();
	delete $data->{'@metadata'};
	$json =~ /^(.*)\.json/;
	my $lang = $1;
	$strings{$1} = $data;
}

# CHECK STRINGS IN CODE ARE IN en.json
foreach my $string ( sort keys %found ) {
	if (!$strings{"en"}{$string}) {
		my $used = join(", ", @{$found{$string}});
		print "$string was not found in en.json, used in $used\n";
	}
}

print "\n";
# CHECK STRINGS IN en.json OCCUR IN CODE
foreach my $string ( sort keys %{$strings{"en"}}) {
	if (!$found{$string}) {
		print "$string was found in en.json, but is not used in code\n";
	}
}
