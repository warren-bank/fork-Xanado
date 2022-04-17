#!/usr/bin/perl
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
foreach my $dir ("js/browser", "js/game", "js/server") {
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
# all langauges (including qqq.json, which contains documentation)
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
# Check that all keys in other languages occur in en
foreach my $lang (sort keys %strings) {
	next if ($lang eq "en");
	print "Check $lang\n";
	my $titled = 0;
	my @ens;
	foreach my $key (sort keys %{$strings{en}}) {
		if ($strings{$lang}{$key}) {
			checkParameters($key, $strings{$lang}{$key});
			next;
		}
		if (!$titled) {
			print "-------------- $lang HAS NO TRANSLATION FOR\n";
			$titled = 1;
		}
		print STDERR "\"$key\"\n";
		push(@ens, "\"$strings{en}{$key}\"");
		$warns++;
	}
	if ($titled) {
		print "-------------- CORRESPONDING ENGLISH STRINGS\n";
		print join("\n", @ens),"\n";
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
}
