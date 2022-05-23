#!/usr/bin/perl
# Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
# License MIT. See README.md at the root of this distribution for full
# copyright and license information

# Check all strings in code and HTML are reflected in en.json and translations
use strict;
use utf8;
use Path::Tiny;
use JSON;

die "Must be run from the root directory\n" unless -d "html";

binmode(STDOUT, ":utf8");
binmode(STDERR, ":utf8");

my %found;

# LOAD HTML
# Attributes scanned:
# data-i18n=
# data-i18n-placeholder=
# data-i18n-tooltip=
my $htmld;
opendir($htmld, "html");
foreach my $html (grep { /\.html$/ } readdir($htmld)) {
	my $data = path("html/$html")->slurp();
	while ($data =~ /data-i18n(?:|-placeholder|-tooltip)=(["'])(.*?)\1/g) {
		push(@{$found{$2}}, $html);
	}
}
closedir($htmld);

# LOAD JS
# Scan calls to .i18n(, grab $1
# Scan /*i18n*/ before a string, grab the string
# Scan /*i18n prefix*/ before a string, grab prefixthestring e.g.
# /*i18n namespace-$/'frood' will grab 'namespace-frood'
my $jsd;
opendir($jsd, "js");
foreach my $dir (grep { -d $_ } readdir $jsd) {
	my $jsdd;
	opendir($jsdd, $dir);
	foreach my $js (grep { /\.js$/ } readdir($jsdd)) {
		my $data = path("$dir/$js")->slurp();
		$data =~ s/[\r\n]+/ /g;
        my $report = 0;
		while ($data =~ /\.i18n\s*\(\s*(["'])(.*?)\1/g) {
			push(@{$found{$2}}, $js);
		}
		while ($data =~ /\/\*i18n(?: ([-\w]*?))?\*\/\s*(["'])(.*?)\2/g) {
			my $key = ($1 || '') . $3;
			push(@{$found{$key}}, $js);
		}
        $report = 0
	}
	closedir($jsdd);
}
closedir($jsd);

sub checkParameters {
	my ($en, $qq) = @_;
	while ($en =~ /(\$\d+)/g) {
		my $p = $1;
		my $re = "\\$p([^\\d]|\$)";
		if ($qq !~ /$re/) {
			print STDERR "\"$en\": $p not found in \"$qq\"\n";
		}
	}
}

# LOAD STRINGS
# from i18n/*.json
# If a language or qqq is passed in ARGV[0] will load that, otherwise will load
# all languages (including qqq.json, which contains documentation)
my $i18nd;
my %strings;
my @lingos = qw(en);
if (scalar(@ARGV) > 0) {
	push(@lingos, @ARGV);
} else {
	opendir($i18nd, "i18n");
	@lingos = map { $_ =~ /(.*)\.json$/; $1 } grep { /\.json$/ } readdir($i18nd)
}
foreach my $lang (@lingos) {
	my $data = decode_json(path("i18n/${lang}.json")->slurp());
	delete $data->{'@metadata'};
	$strings{$lang} = $data;
}

my $warns = 0;

foreach my $string ( sort keys %found ) {
	if (!$strings{"en"}{$string}) {
		#print "Assuming '$string' is OK\n";
		$strings{"en"}{$string} = $string;
	}
}

# CHECK STRINGS IN en.json OCCUR AT LEAST ONCE IN HTML/JS
foreach my $string (sort keys %{$strings{"en"}}) {
	if (!$found{$string}) {
		print STDERR "'$string' was found in en.json, but is not used in code\n";
		$warns++;
	}
}

# CHECK OTHER LANGUAGES
# Check that all keys in en are also in other languages.
# Check that all keys in other languages occur in en.
# qqq is treated as a language
foreach my $lang (sort keys %strings) {
	next if ($lang eq "en");
	print "Check $lang\n";
	my $titled = 0;
	foreach my $key (sort keys %{$strings{en}}) {
		if ($strings{$lang}{$key}) {
			checkParameters($key, $strings{$lang}{$key});
			next;
		}
		if (!$titled) {
			print "-------------- $lang HAS NO TRANSLATION FOR\n";
			$titled = 1;
		}
		print STDERR "\"$key\": $strings{qqq}{$key}, ";
		if ($found{$key}) {
			print STDERR "Found in ",join(", ", @{$found{$key}}),"\n";
		} else {
			print STDERR "Not found\n";
		}
		if ($strings{en}{$key} ne $key) {
			print STDERR "English is: $strings{en}{$key}\n";
		}
		$warns++;
	}

	$titled = 0;
	foreach my $key (sort keys %{$strings{$lang}}) {
		next if ($strings{"en"}{$key});
		if (!$titled) {
			print "-------------- UNUSED STRINGS IN $lang (sed script)\n";
			$titled = 1;
		}
		print STDERR "/\"$key\":/d\n";
		$warns++;
	}
}


if ($warns > 0) {
	print STDERR "$warns warnings\n";
	print STDERR "See https://github.com/wikimedia/jquery.i18n for help with string formats\n";
	print STDERR "See i18n/qqq.json for help with string meanings\n";
}
