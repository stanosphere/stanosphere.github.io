---
title: "Advent of Code 2020 Day 9 (practice before AoC 2026 happens)"
year: 2020
day: 9
draft: false
pubDate: 2026-11-27
---

## Initial Thoughts

- I can create a `Set` that contains all possible sums of numbers
- I'll be able to do this because there aren't actually that many pairings
- And in fact because addition is commutative that halves the number of sums (basically I'd be looking at the upper triangle of a matrix)
- From scanning the input I _think_ some numbers might be repeated in one of the lists of 25 numbers

So all told I should be able to brute force this.
However I have a feeling part 2 will do something evil like consider sums of like 20 numbers or do something weird with multiplication.
I think there's probably something you can do where you don't recompute the sums from scratch each time too.

## Code for Part 1

```haskell
module Day9 where

import Data.Foldable (find)
import qualified Data.Set as S
  ( Set,
    fromList,
    member,
  )
import Utils.Grouping (windows)

part1 :: IO (Maybe Int)
part1 = fmap last . find (not . isValid) . windows 26 <$> getInput "./fixtures/input9.txt"

-- takes 26 numbers and checks if the last number is the sum of any pair of the previous 25
isValid :: [Int] -> Bool
isValid xs = S.member (last xs) (getAllSums . take 25 $ xs)

getAllSums :: [Int] -> S.Set Int
getAllSums xs = S.fromList [(x + y) | (i, x) <- zipped, (j, y) <- zipped, i < j]
  where
    zipped :: [(Int, Int)]
    zipped = zip [0 ..] xs

getInput :: FilePath -> IO [Int]
getInput = fmap (map read) . fmap lines . readFile
```

Where I've used one of my helpers from previous years, which I'll also show here:

```haskell
-- like scala's `sliding`
-- works on infinite lists and everything
windows :: Int -> [a] -> [[a]]
windows n = takeWhile ((n ==) . length) . map (take n) . tails
```

## Thoughts on Part 2

Ok so this isn't at all the part 2 I was anticipating! In fact I suspect I'm wildly wrong more often than not about what the part 2 will be!

Ok so I have my answer from part 1 and I need to find a contiguous run of numbers that sum to it.

- Obviously this set must not contain any numbers bigger than my answer to part 1 which may narrow it down a little
- How many possible contiguous subsequences are there for a list with `n` elements?
  - clearly there are `n` singletons
  - `n - 1` duos
  - `n - 2` trios
  - And then 1 "trivial" subsequence which is just the whole list
  - So I need to add up `1 + ... + n`
  - As a young Gauss once said that's gonna be `n * (n + 1) / 2`
  - So for my 1000 line input that's actually not too bad, it's about half a million
  - So I think this is brute force friendly on my laptop!

There will surely be a clever way to do this. For example you could build up your sequences starting from the start and once your sum goes over the threshold you move to a new starting point.
In fact that sounds easier than finding all subsequences lol, so I'll do that.

Ok so what I need to do is

- from the start of the list check the first item
- then check the first 2, first 3, first `k` items until your sum gets bigger than the answer for part 1
  - I _think_ `inits` or something just gives us this, right?
  - Yeah if I do `inits [1..4]` that gives me `[[],[1],[1,2],[1,2,3],[1,2,3,4]]` which is roughly what I want
- then start from the 2nd item in the list and repeat until you find the desired subsequence
  - So this essentially would be looking at `inits . drop 1`

I guess in general it is not guaranteed that there exists exactly one subsequence like this but the question setter will surely have ensured that for everyone's input this in fact is the case!

## Code for Part 2

```haskell
part2 :: IO Int
part2 = do
  part1Answer <- fromJust <$> part1
  input <- getInput "./fixtures/input9.txt"
  return . getMaxPlusMin . findContiguousSubSequence part1Answer $ input

getMaxPlusMin :: [Int] -> Int
getMaxPlusMin xs = minimum xs + maximum xs

findContiguousSubSequence :: Int -> [Int] -> [Int]
findContiguousSubSequence target xs = case find ((>= target) . sum) . inits $ xs of
  Just res | sum res == target -> res
  _ -> findContiguousSubSequence target (drop 1 xs)
```

`findContiguousSubSequence` perhaps warrants some explanation.
I know that all the numbers are positive so adding more numbers will increase the sum.
So I find the first case where we either hit or exceed our target, that's why I use the inequality.
Then I do a second (maybe wasteful) check to see if we have hit our target or not.
And if we haven't we just try the next starting point.
The idea behind using `find` is it won't process any more than it needs to so I'm basically making sure we stop early where we can!

## Final Thoughts

I'm mostly glad I can still write code.
I did this to make sure I'm set up for AoC 2026 and this is one of the problems I hadn't got around to yet!

This was interesting in the sense that the answer to part 2 directly depended on the answer to part 1.
I guess this manifests as somewhat cumbersome `do` notation, although I think this could be avoided by using suitable applicative combinators but I'm too out of practice for that!

I feel my solution is fine but not great, I imagine there's a way to solve this that involves fewer scans than what I'm doing. In fact I think I could probably modify my solution to use one of the `scan` functions so that I do not have to compute a `sum` each time...
But like I say I think there must be an overall more optimal approach than even this!
I think if I was doing this live I'd be glued to the solution thread to find a better approach.

A miscellaneous observation is that I really like `ghci`'s interactiveness. It was super easy for me to be like "oh what does `inits` do again?" without any faff at all really.
I guess in my first job I was raised on repl.it so I just love a repl!
Although repl.it itself now seems to be a lot more than just a repl.

## Final Full Solution

I did decide to try using `scanl` and it works!
I could maybe have checked the performance gain, oh well.
Here's the full solution with that change and a couple of minor improvements too.

```haskell
module Day9 where

import Data.Foldable (find)
import Data.List (tails)
import Data.Maybe (fromJust)
import qualified Data.Set as S
  ( Set,
    fromList,
    member,
  )
import Utils.Grouping (windows)

part2 :: IO Int
part2 = do
  part1Answer <- fromJust <$> part1
  input <- getInput "./fixtures/input9.txt"
  return . getMaxPlusMin . findContiguousSubSequence part1Answer $ input

getMaxPlusMin :: [Int] -> Int
getMaxPlusMin xs = minimum xs + maximum xs

findContiguousSubSequence :: Int -> [Int] -> [Int]
findContiguousSubSequence target xs =
  case findWithIndex (>= target) . scanl (+) 0 $ xs of
    Just (i, s) | s == target -> take i xs
    _ -> findContiguousSubSequence target (drop 1 xs)
  where
    findWithIndex :: (a -> Bool) -> [a] -> Maybe (Int, a)
    findWithIndex p = find (p . snd) . zip [0 ..]

part1 :: IO (Maybe Int)
part1 = fmap last . find (not . isValid) . windows 26 <$> getInput "./fixtures/input9.txt"

-- takes 26 numbers and checks if the last number is the sum of any pair of the previous 25
isValid :: [Int] -> Bool
isValid xs = S.member (last xs) (getAllSums . take 25 $ xs)

getAllSums :: [Int] -> S.Set Int
getAllSums xs = S.fromList [x + y | (x : ys) <- tails xs, y <- ys]

getInput :: FilePath -> IO [Int]
getInput = fmap (map read . lines) . readFile

```

I find that in real AoC rather than this practice I do like to tidy up my solutions a little even after I've got the answer!
