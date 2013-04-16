#!/usr/bin/env perl -w

use strict;

my $host = $ARGV[0] || 'localhost:3000';

while(1) { 
  my $b = join "", map { chr(97 + (int(rand(26)))) } (0..24);
  print "$b\n";
  my $url = "http://$host/api?seq=1&board=$b&minFrequency=0&oursBitMask=0&theirsBitMask=0";
  print `curl -sS '$url'`;
}

