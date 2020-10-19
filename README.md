
# Pancode

The pan-Unicode programming language! Pancode is a stack-based
esoteric programming language written by Mercerenies. You can check
out the
[documentation](https://mercerenies.github.io/pan-unicode-lang/docs.html)
or dive straight in to the [online
interpreter](https://mercerenies.github.io/pan-unicode-lang/index.html).
Note that the language is a work-in-progress, so expect some changes,
and in particular more thorough documentation is coming soon.

In the meantime, here are some examples.

## Hello World

    "Hello, world!" .

## Factorial (Recursive)

    , [ s ø 0 > [ [ : 1 - ] D $ × ] [ %② 1 ] i ] $ .

## Factorial (Iterative)

    { , [ ] ⍳ } 1 + `× / .

## Fibonacci Sequence

    { 0 1 , 2 - [ % :② + ] ⍳ } .
