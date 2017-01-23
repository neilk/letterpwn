# LetterPwn

This is a side project, with a few goals:
* Fun!
* My first Node.js project. I wouldn't code like this today.
* I wanted to see what a CPU-bound task would be like in Node.js, since everyone moaned about how that was the worst part of Node.js. 

## Background

[LetterPress](http://www.letterpressapp.com/) is a game for iOS released by Loren Brichter in 2013.

I got a bit obsessed with it. My way of stopping myself from playing too much was to write a solver for all possible LetterPress positions. (It is much faster and much better than anybody else's, as far as I know.)

You can [try it out!](http://letterpwn.neilk.net/)

## Blog posts

People occasionally cite my blog post about [concurrency techniques](http://neilk.net/blog/2013/04/30/why-you-should-use-nodejs-for-CPU-bound-tasks/) but to be honest the title was kind of intended to be controversial. Of course Node.js is actually a problematic choice for many IO- and CPU-intensive tasks, but there are ways around it.

I'm actually a little more proud of the [solving algorithm](http://neilk.net/blog/2013/04/16/letterpwn-a-nodejs-based-letterpress-solver/).
