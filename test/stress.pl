#!/usr/bin/env perl -w

use strict;

my $host = $ARGV[0] || 'localhost:3000';

my @childPid; 

$SIG{'TERM'} = $SIG{'INT'} = sub {
  local ($SIG{CHLD}) = 'IGNORE';
  kill 9, @childPid;
  exit(0);
};

for my $child (0..4) {
  if (my $pid = fork()) {
    push @childPid, $pid;
    next;
  }

  while(1) { 
    my $b = join "", map { chr(97 + (int(rand(26)))) } (0..24);
    my $combo = rand() * 3 > 1 ? 'true' : 'false';
    print "$b $combo\n";
    my $url = "http://$host/api?seq=1&board=$b&minFrequency=0&oursBitMask=0&theirsBitMask=0&isClientComboAble=$combo";
    my $ret = `curl -sS '$url'`;
    $ret =~ s/[\n\r]//g;
    $ret = substr($ret, 0, 20);
    print "return for $b: " . $ret . "\n" 
  }
}

sleep; #wait for signal to kill children
