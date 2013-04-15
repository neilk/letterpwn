#!/usr/bin/env perl -w

use strict;
while(1) { 
  my $b = join "", map { chr(97 + (int(rand(26)))) } (0..24);
  print "$b\n";
  my $url = "http://localhost:3000/api?seq=1&board=$b&minFrequency=0&oursBitMask=0&theirsBitMask=0";
  print `curl -sS '$url'`;
}

