#!/usr/bin/env perl -w

use strict;
use Time::HiRes qw/usleep gettimeofday/;

my $host = $ARGV[0] || 'localhost:3000';
undef $/;
my $delay = 0; # 5000000;

my @childPid; 

$SIG{'TERM'} = $SIG{'INT'} = sub {
  local ($SIG{CHLD}) = 'IGNORE';
  kill 9, @childPid;
  exit(0);
};

sub uTime {
  my ($sec, $usec) = gettimeofday();
  return $sec * 1e6 + $usec;
}

for my $child (0..5) {
  usleep(1e6 + rand(1e6));
  if (my $pid = fork()) {
    push @childPid, $pid;
    next;
  }

  my @boards;
  my @freqs = (18, 15, 12, 9, 0);
  while(1) {
    # usleep($delay * (rand 2));
    shift @boards;
    push @boards, join "", map { chr(97 + (int(rand(26)))) } (0..24);
    my $b = $boards[int(rand @boards)];
    my $f = $freqs[int(rand @freqs)];
    my $combo = rand() * 3 > 1 ? 'true' : 'false';
    my $url = "http://$host/api?seq=1&board=$b&minFrequency=$f&oursBitMask=0&theirsBitMask=0&isClientComboAble=$combo";
    my $start = uTime();
    print "$start REQUEST $url\n";
    my $status = system("curl -Sfs '$url' > /dev/null");
    my $end = uTime();
    my $delta = $end - $start;
    print $status ? ("$end ERROR $url $status $delta\n") : "$end SUCCESS $url $delta\n";
    # if ($delay > 0) {
    #  $delay -= 1000;
    # }
  }
}

sleep; #wait for signal to kill children
