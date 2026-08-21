---
title: "Counting Gappy Straights in Balatro"
description: "Using brute force computation and then a slightly clever mathematical technique to count the number of straights and straights where gaps are allowed thanks to the shortcut joker."
draft: false
pubDate: 2026-08-21
---

## TL;DR

This got a bit out of hand.

This started off as me thinking about Balatro and ended up with me going fairly deep into counting (I have _always_ enjoyed counting) using combinatorics for some parts, and programming for others.
For the combinatorics aspect it turns out a natural structure to use when thinking about straights is a **multiset** and then you end up with "death by **binomial coefficients**" and later "death by **multinomial coefficients**".
I thoroughly enjoyed this journey but it is rather a long journey.
I'm not sure what sort of person would read this article in its entirety but given that I've gone to the effort of using an article to organise my thoughts it can't hurt to publish it in case someone else is interested in some of the sections!

Once I worked out the "nice" way to count straights using maths rather than brute force I perhaps could have shortened and simplified this post!
But I think it's good to show the full journey that I went on rather than pretend that I'm some sort of all knowing maths sorcerer who was able to just write down the answer!

## Introduction

Balatro is a game about getting poker hands.
It's great fun and ruined my sleeping pattern the week I first got it because of how good it is.
The basic premise of the game is that you want to play poker hands and get big scores.
The game can go on forever if you want it to, you just need to get bigger and bigger scores each round.
You are given jokers to help you get big scores which can boost certain hands, treat two suits as the same, and lots of other weird and wonderful things!

The other day I got the [Shortcut joker card](https://balatrogame.fandom.com/wiki/Shortcut) that lets you have straights with gaps of 1 early on in a run and against my every instinct I thought "oh I'll do a straight-only run".
I usually find straights quite difficult to deal with.
But with this joker it felt like I was getting a straight at the start of basically every round.
Here's how the wiki describes it:

> Shortcut allows Straights to be made with one or more gaps of 1 rank between cards (ex: 2 4 5 7 9).

The key part is that we're allowed **one or more** gaps, and each gap is a single missing rank.
So it got me thinking: How likely is it that my first hand will contain a straight?
Now my deck at the time was of course a non-standard deck since Balatro lets you do all sorts of outrageous things like copy cards, destroy cards, change the suit and/or rank of a card, that sort of thing.
But I can still ask this question of a standard 52 card deck.

> Given a standard 52 card deck what is the probability that the first 8 cards I draw contain a straight where gaps of one are allowed?

## Normal Straights

It's perhaps easiest to answer a different question first though.
What's the probability of a normal straight appearing in the first 8 cards you draw?
A naive way to answer this is to generate all possible combinations of 8 cards and then simply count how many contain a straight.
That's quite a lot of combinations to check of course.
We can use the well known ["n choose k"](<(https://en.wikipedia.org/wiki/Combination)>) formula for this, $n! / \bigl((n-k)!\,k!\bigr)$, with $n = 52$ and $k = 8$.
An intuitive explanation for this formula is that we have 52 choices for the first card, 51 choices for the 2nd, ... , 45 choices for the 8th: multiplying all those numbers together gives us the $n! / (n-k)!$ part.
For the division by $k!$ we just note that there are $8!$ ways to arrange the 8 cards we have chosen which all lead to the same set of cards so we divide by it to avoid counting the same combination multiple times.
Anyway we can just use this result to see that there are $752{,}538{,}150$ ways to choose 8 cards from a full deck. That's just shy of a billion so loads of combinations to check.

### Brute Force

We can write some code to generate all these combinations.
I'll do this using Scala since it's the language I happen to use at work.
I'll maybe pop all this on github later.
We can use a case class to model a card: all we really care about is that it has a rank and a suit.

```scala
case class Card(rank: Rank, suit: Suit)
```

We also of course need to define a rank and suit. Enums (which were introduced in scala 3) should work nicely for this.

```scala
enum Rank:
  case Ace
  case Two
  case Three
  case Four
  case Five
  case Six
  case Seven
  case Eight
  case Nine
  case Ten
  case Jack
  case Queen
  case King

object Rank:
  // I'm a bit surprised that I have to do this, oh well!
  given ordering: Ordering[Rank] = Ordering.by(_.ordinal)
```

```scala
enum Suit:
  case Spade
  case Heart
  case Club
  case Diamond
```

Nice and easy. Now let's generate a full deck from which we can draw the combinations (if you've not seen the below notation before just think of it as nested loops.)

```scala
  val fullDeck: List[Card] =
    for {
      rank <- Rank.values.toList
      suit <- Suit.values.toList
    } yield Card(rank, suit)
```

We can use the scala standard library's [`.combinations`](https://scala-lang.org/api/3.x/scala/collection/SeqOps.html#combinations-fffffbef) function to generate all the combinations for us. I really love the scala standard library, it has so many convenient things in it like this. If we evaluate

```scala
fullDeck.combinations(8).length
```

then we do indeed see that we get $752{,}538{,}150$. How wonderful.

We must now turn our attention to finding a way to figure out if a given hand contains a straight or not. Something that looks like

```scala
def containsStraight(hand: List[Card]): Boolean = ???
```

Which we should then be able to use like

```scala
fullDeck.combinations(8).count(containsStraight)
```

A straight is of course just a run of consecutive cards. So we can detect a straight by

- getting rid of the suits that the cards have since they don't matter
- getting rid of duplicate ranks since they don't matter
- checking that after this elimination we still have at least five cards
- sorting the cards by rank
- getting hold of slices of 5 cards, so if we had `[3,4,5,7,8,9,J]` that would gives us three possible slices like `[[3,4,5,7,8], [4,5,7,8,9], [5,7,8,9,J]]`
- iterating over each slice to see if any contain a run of consecutive cards (which can be done by checking if the last card is 4 away from the first)

That's quite a few steps but I think it's at least fairly straightforward reasoning and I kind of hope a similar approach can be used when we think about straights with gaps (perhaps I should have actually done that before starting to write this blog post but where's the fun in that?)

Anyway the code looks like this

```scala
  def containsStraight(hand: List[Card]): Boolean = {
    val sortedHand =
      hand.map(_.rank).distinct.sorted

    def containsConsecutiveRun(sortedRanks: List[Rank]) =
      sortedRanks.length >= 5 &&
        sortedRanks
          .sliding(5)
          .exists { window =>

            val lowest  = window.head.ordinal
            val highest = window.last.ordinal

            highest == lowest + 4
          }

    containsConsecutiveRun(sortedHand)
  }
```

#### Testing the Brute Force Approach

We should test this function. I'm an [munit](https://scalameta.org/munit/) enjoyer myself so I shall use that.
We can write some basic unit tests

```scala
class StraightCountSpec extends munit.FunSuite:

  test("containsStraight should correctly identify a hand which contains a straight") {
    val hand = List(Rank.Five, Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine).map(Card(_, Suit.Spade))

    assert(containsStraight(hand))
  }

  test("containsStraight should correctly identify a hand which does not contain a straight") {
    val hand = List(Rank.Two, Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine).map(Card(_, Suit.Spade))

    assert(!containsStraight(hand))
  }
```

It's not hard to imagine how we might write other similar tests but they're not the most helpful tbh.

We can also write some property based tests (although for now I can only really think of how to generate hands that definitely do contain straights, I can't really think of how to generate a hand that definitely doesn't!) If you've not encountered a property based test before the overall idea is that you generate a load of random data and check that some condition always holds for each case. A good example of this is testing typeclass laws in cats. A further example might be checking that the round trip for serialisation and deserialisation leaves your object unchanged.

Anyway we must first specify how to generate a hand that contains a straight. In Balatro your deck can of course have all sorts of crazy things going on but for this exercise let's consider a standard deck only. Crucially each card is unique so we want to makes sure that our generated straights contain no duplicate cards.

The first job is to generate a straight, we can worry about adding other random cards later.

A straight can start with anything from Ace to Ten. To generate a straight we shall first pick some card to start our straight with by choosing a random rank from Ace to Ten and a random suit. Next we can generate the other 4 cards by iterating a function that produces a new card with a rank one higher than the previous and with a random suit. To do this we can use scalacheck's `Gen` type.

```scala
  val genStraight: Gen[List[Card]] = {
    def nextRank(r: Rank): Rank =
      if r == Rank.King
      then Rank.Ace
      else Rank.fromOrdinal(r.ordinal + 1)

    def genNextCard(c: Card): Gen[Card] =
      genSuit.map(Card(nextRank(c.rank), _))

    for {
      firstCardRank <- Gen.oneOf(Rank.values.takeWhile(_ != Rank.Jack))
      firstCard     <- genSuit.map(Card(firstCardRank, _))
      straight      <- iterate(firstCard, 5)(genNextCard)
    } yield straight
  }

  def iterate[F[_]: Monad, A](start: A, len: Int)(f: A => F[A]): F[List[A]] =
    List
      .iterate(start.pure[F], len)(_.flatMap(f))
      .sequence
```

I probably could have somehow used cat's `iterateUntilM` rather than define my own way of doing monadic iteration but where's the fun in that? I suppose this illustrates a weakness of property based testing: generating data can sometimes be a little complicated (or maybe it's _me_ that's making it more complicated than it needs to be rofl.) It certainly also demonstrates a weakness of scala: the definition of `iterate` is sprinkled with all sorts of things people who aren't familiar with functional programming may be confused by (`Monad`, higher kinded types, that sort of thing...) To that end I can write a slightly less general version of `iterate` that is specific to `Gen` rather than something that will work for any type which has a monad instance.

```scala
  def iterate[A](start: A, len: Int)(f: A => Gen[A]): Gen[List[A]] =
    List
      .iterate(Gen.const(start), len)(_.flatMap(f))
      .sequence

  extension [A](xs: List[Gen[A]])
    def sequence: Gen[List[A]] =
      xs.foldRight(Gen.const(List.empty[A]))((gx, acc) => for y <- gx; ys <- acc yield y :: ys)
```

Mind you that is still fairly disgraceful as I've had to define `sequence` myself too. This is starting to be too much of digression isn't it lol?

Let's attempt to get back on track.

Before we start generating hands that contain straights and other random cards we might as well add some tests for hands that literally are just straights.

```scala
class StraightCountPropertySpec extends ScalaCheckSuite:

  property("hands that are just straights should always contains a straight") {
    forAll(genStraight)(containsStraight)
  }

  property("hands that are just shuffled straights should always contains a straight") {
    forAll(genStraight.map(shuffle))(containsStraight)
  }
```

They're rather simple compared to the data generation. The tests also fail, oh no! The message reads

```
Failing seed: iJg4I6spz7_oXknnVeu2DxOq1kCOwY7BrqVePmuB35L=
You can reproduce this failure by adding the following override to your suite:

  override def scalaCheckInitialSeed = "iJg4I6spz7_oXknnVeu2DxOq1kCOwY7BrqVePmuB35L="

Falsified after 34 passed tests.
> ARG_0: List()
> ARG_0_ORIGINAL: List("Card(Ten,Diamond)", "Card(Jack,Spade)", "Card(Queen,Diamond)", "Card(King,Club)", "Card(Ace,Club)")
```

The `ARG_0` part, I think, is scalacheck trying very hard to simplify the initial argument that was fed into the test so that we have a simpler case that's easier to understand. However this isn't massively useful to us in this case lol. What is useful is `ARG_0_ORIGINAL`: it has revealed that in my initial implementation I neglected Ace-high straights which was very rude of me. This is easy to correct.

```scala
  def containsStraight(hand: List[Card]): Boolean = {
    val sortedHand =
      hand.map(_.rank).distinct.sorted

    def containsConsecutiveRun(sortedRanks: List[Rank]) =
      sortedRanks.length >= 5 &&
        sortedRanks
          .sliding(5)
          .exists { window =>

            val lowest  = window.head.ordinal
            val highest = window.last.ordinal

            highest == lowest + 4
          }

    def containsConsecutiveRunWithHighAce(sortedRanks: List[Rank]) =
      sortedRanks.length >= 5 &&
        sortedRanks.head == Rank.Ace &&
        sortedRanks.takeRight(4) == Rank.values.toList.takeRight(4)

    containsConsecutiveRun(sortedHand) || containsConsecutiveRunWithHighAce(sortedHand)
  }
```

With this implementation the tests now all pass. Amazing. We may also define a generator that generates hands of a random size that are guaranteed to contain a straight. As I said earlier we also want these hands to be realistic (contain no duplicate cards) so I can add a sort of meta test for that. To do this we can first choose how many cards we want to be in our hand, generate a straight using `genStraight` and finally keep adding cards to it until we've got a hand of the desired size.

```scala
  val fullDeck: Set[Card] = {
    for
      rank <- Rank.values.toList
      suit <- Suit.values.toList
    yield Card(rank, suit)
  }.toSet

  val genHandWithStraight: Gen[List[Card]] = {

    def addUnusedCardToHand(hand: List[Card]): Gen[List[Card]] =
      Gen.oneOf(fullDeck.diff(hand.toSet)).map(_ :: hand)

    for {
      numberOfCardsToUse <- Gen.chooseNum[Int](5, 20)
      straight           <- genStraight
      hand               <- Monad[Gen].iterateUntilM(straight)(addUnusedCardToHand)(_.length == numberOfCardsToUse)
    } yield shuffle(hand)
  }
```

This is one of the things I like about scalacheck's `Gen` type: it's really easy to build more complicated `Gen`s from simpler ones.

We can add some tests involving this new generator.

```scala
class StraightCountPropertySpec extends ScalaCheckSuite:

  property("hands that are just straights should always contains a straight") {
    forAll(genStraight)(containsStraight)
  }

  property("hands that are just shuffled straights should always contains a straight") {
    forAll(genStraight.map(shuffle))(containsStraight)
  }

  property("hands generated by genHandWithStraight never contain duplicate cards") {
    forAll(genHandWithStraight)(hand => hand.distinct == hand)
  }

  property("hands that are straights with extra cards should always contain a straight") {
    forAll(genHandWithStraight)(containsStraight)
  }
```

They all pass.

I am now fairly confident that my implementation of `containsStraight` is correct.

#### Finally Some Answers!

Let's unleash the brute force approach! We can start from 5 and go up to 8 (since that's the starting hand size in Balatro.) Here is a table of results.

| Hand size | Total hands       | Hands containing a straight | Probability of a straight |
| --------- | ----------------- | --------------------------- | ------------------------- |
| $5$       | $2{,}598{,}960$   | $10{,}240$                  | $0.39\%$                  |
| $6$       | $20{,}358{,}520$  | $367{,}616$                 | $1.81\%$                  |
| $7$       | $133{,}784{,}560$ | $6{,}454{,}272$             | $4.82\%$                  |
| $8$       | $752{,}538{,}150$ | $73{,}870{,}336$            | $9.82\%$                  |

For the 8 card version I was (unsurprisingly) waiting a while before the result was spat out.

I would love to compare these results to some other results on the internet.
However from what I can tell other sources (quite rightly) discount straight flushes and hands which contain a straight and flush when talking about how many straights can be made for a given hand size.
In Balatro straights can be more powerful than flushes if you have relevant jokers and/or if you use the [Saturn card](https://balatrogame.fandom.com/wiki/Planet_Cards) to level up your straights.
Whereas in standard poker flushes are always more powerful than straights and so it's always better to play a flush than a straight unless you're maybe doing some crazy mind games or something (IDK, I guess we'd have to ask a poker champion like my favourite TV presenter, Victoria Coren Mitchell, if this ever happens)

### Combinatoric Approach

I'm not an amazing mathematician but I've done stuff with combinatorics when I was carefree Physics Student.
Turns out a lot of degree level physics is just counting stuff in fancy ways.

#### 5 cards

Usually when counting things it's a good idea to start with the simplest possible version of the thing you're trying to count.
The simplest case for us is to consider hands of five cards.
As I mention in the previous section a straight may start with any card from Ace to Ten (inclusive) hence there are 10 unique classes of straight in terms of starting rank.
Each card in such a straight can come from any of the 4 suits.
There are 5 cards so that gives us $4^5$ combinations. Therefore the total number of ways to make a straight with 5 cards is $10 \times 4^5$ which evaluates to $10{,}240$.
The same number from the brute force approach.

#### 6 cards

Now we're ready for the horror of hands that contain more than 5 cards. To find out how many hands of 6 cards contain a straight we might naively think that we can just say it's the number of ways we can make a straight with 5 cards multiplied by the number of choices for a 6th card (there would be 47 such choices to make.) sadly this does not work since it would mean we double count some hands.

Let's work through an example of double counting. Consider the straight where we start at 3, end at 7, and all cards are diamonds.
Some of the choices for the 6th card will be double counted.
If the 6th card is one of the 4 remaining 2s then the resulting hand would also be counted when we consider straights that start with a 2.
Likewise if the 6th card is one of the 4 remaining 8s then the resulting hand would be double counted when we consider straights that end with an 8.
There's another more subtle form of double counting.
Still considering the straight where we start at 3, ends at 7, and all cards are diamonds if we choose the 6th card to be one of the 3 remaining 3s, say the 3 of clubs, then that hand would be double counted when we consider the straight that starts with the 3 clubs and we pick the 3 of diamonds as the 6th card.
This same argument applies to all numbers featured in our straight: 3,4,5,6,7.

It seems to me that the problem of double counting arises from what I am going to call **degenerate straights**. Not all straights are degenerate of course, there are some nice ones out there.
What I mean by degenerate straights are hands that contain a straight **and** duplicate ranks of some kind.
So for example 2,3,4,5,6 of diamonds together with the 3 of spades is a degenerate straight.
Another example (using 8 cards) would be 2,3,4,5,6 of diamonds, 2,3 of spades, and 3 of clubs.
This hand contains a straight **and** a full house, huge!

So we need a way to deal with these degenerate straights. I have found a way to do this that is heavily inspired by this [this Math Stack Exchange answer](https://math.stackexchange.com/questions/3084135/calculating-combinations-of-a-straight-in-texas-hold-em). Please do feel free to read it but I will assume that you have not read it and explain everything from scratch!

#### Dealing With Degeneracy

What makes a hand contain a straight?
All that actually matters is the set of ranks in the hand.
The suits and repeated ranks don't contribute at all to the "straightness" of a hand.

> Whether or not a hand contains a straight depends only on the **set** of ranks in that hand.

Now of course the suits and repeated ranks _do_ contribute to the number of different possible hands that are straights.
In fact they give us a nice organised way to count straights, we can consider each type of degeneracy separately.
Obviously for straights with only 5 cards there is only one degeneracy class (there can't ever be degenerate ranks with 5 cards) and we've already properly counted those straights.
So using classifying by degeneracy is first useful when we consider hands of 6 cards.

There are actually only 2 degeneracy classes for straights with 6 cards.
You either have a pair or you don't.

##### 6 Cards, No Pairs

Let's consider the **no pairs** case first.
You can either have a standard 5 card straight or if you're luckier a full on 6 card straight (e.g. 2,3,4,5,6,7.)
Remember at this point we don't care about suits, that will come later!
Ok so how many 6 card straights are there?
Well the straight can start with anything from Ace through to 9 (if we started with 10 we'd get 10,J,Q,K,A,2 and wrap around straights aren't allowed.)
So that's 9 possible straights of 6 cards.

Now we have to consider the case of straights with 5 cards and we have to super careful not to accidentally count straights with 6 cards; the 6th card we choose has to be nowhere near a straight.
Ok so as previously discussed we have 10 possible straights of 5 cards.
And these come in two flavours: they either contain an Ace or they don't.
If they contain an Ace (i.e. A,2,3,4,5 and 10,J,Q,K,A) then there are 7 choices for the 6th card.
This is because it's not allowed to be adjacent to any cards in the straight, so if the straight is A,2,3,4,5 then we can choose any of 7,8,9,10,J,Q,K, we're just not allowed to pick 6 because that would give us a run of 6 cards or any of A,2,3,4,5 because that would give us a pair.
If they do not contain an Ace then there are only 6 choices for the 6th card.
Once again this is easiest to see with an example. Let's consider the straight 4,5,6,7,8.
Now we obviously can't pick 4,5,6,7,8 because that would give us a pair.
But we also can't pick 3 or 9 because they would give us a run of 6 cards.
And this leaves us with only 6 choices.
For hands with 6 cards that only have a straight of 5 we therefore have $2 \times 7 + 8 \times 6 = 14 + 48 = 62$ possibilities.

We can add this to our number of possible straights of 6 cards (which was 9 possibilities) to get a total of $71$.
It is perhaps instructive to introduce a special name for these possibilities, we'll call each of these a **Rank Set** so there are 71 rank sets that contain a straight for this particular degeneracy.

> In general the **Rank Set** of a degeneracy is the set of **distinct** ranks that appear in it. We forget suits, and forget how many cards of each rank appear. When we talk about ranks sets what we really care about is how many rank sets contain a straight, we shall call this quantity $S(d)$ where $d$ is a degeneracy class.

So in this case $S(d)$ is 71.

We're not done yet though! We need to introduce the suits now.
This is actually not too bad since there are 6 cards and each card can be any of the 4 suits we simply pick up a factor of $4 ^ 6$.
Hence the final answer for the number of straights in a **hand of 6 with no pairs** is $71 \times 4^6$ which is better known as $290{,}816$.

##### 6 Cards, One Pair

Now we can consider the case with **one pair**.
Mercifully, this case is quite a bit simpler than the previous case.
We can of course only have straights of length 5 in this case (the 6th card is fixed as a duplicate of one of the first 5 cards.)
Once again there are 10 possible starting cards for our straight.
We can say that there are 10 rank sets that contain a straight, so we have that $S(d) = 10$.
This time, because there is a pair, we must now choose which of ranks gets to be a pair.
We have 5 choices here since we only have 5 distinct ranks and only one gets to be a pair.
Another way to think of this is to note that once our straight has been chosen there are 5 choices for the 6th card (it must match one of the cards we have already chosen.)
In any case we can call this concept "**placements**"

> A **placement** says which rank plays which role (i.e. which rank gets to be a pair, which gets to be a triple, etc) We can let $P(d)$ denote the total placements for a degeneracy class.

Hence there are $10 \times 5 = 50$ possible straights with one pair ignoring suits.
This is simply $S(d) \times P(d)$

Introducing suits is a little different this time!
We of course still have 6 cards but we know we always have a pair.
So for the 4 unpaired cards we pick up a factor of $4 ^ 4$ as each of the 4 cards can be any of the 4 suits (so many 4s!)
But for the paired cards we have to choose 2 different suits from a possible 4.
We already know the formula from this from earlier, it's just the binomial coefficient $\tbinom{4}{2} = 6$.
So all told the final answer for straights in a **hand of 6 with one pair** is $5 \times 10 \times 4 ^ 4 \times \tbinom{4}{2}$ which is $76{,}800$

Also let's give the "suit factor" a mathematical symbol too, we'll call it $Su(d)$ [^special-unitary]. So in this case we have $Su(d) = 4 ^ 4 \times \tbinom{4}{2}$.

[^special-unitary]: not to be confused with the [special unitary group](https://en.wikipedia.org/wiki/Special_unitary_group) of degree $d$ lol, I've used a lower case u you see!

##### 6 Cards, Putting it All Together

Wonderful! The last step is simply adding these two number together $290{,}816 + 76{,}800 = 367{,}616$. Wow! That's the same as the brute force method. It is considerably easier to do on a computer than the brute force method, I basically just have to evaluate $5 \times 10 \times 4 ^ 4 \times \tbinom{4}{2} + (2 \times 7 + 8 \times 6 + 9) \times 4^6$ rather than run some exhaustive search. But I have of course just shifted the complexity to working out the ingredients in that formula which, as we have seen, isn't easy (but it's also not too hard.)

##### A General Approach for Dealing with Degeneracy (First Attempt)

Before moving on to the case with a hand of 7 let's take stock of what we've done here.
The steps taken were

1. enumerate the degeneracy classes, $d$
2. for each degeneracy class compute the following quantities and multiply them together
   - $S(d)$, the number of **rank sets** that contain a straight
   - $P(d)$, the number of **placements** of the ranks
   - $Su(d)$, the number of **suit combinations** for the degeneracy class
3. add up the results of each degeneracy class

This is starting to have the makings of an algorithm isn't it!
But first we should apply this technique to hands with 7 cards by hand to further build intuition.
In fact the 7 card version is precisely what the aforementioned [Math Stack Exchange answer](https://math.stackexchange.com/questions/3084135/calculating-combinations-of-a-straight-in-texas-hold-em) dealt with (the key difference being that their treatment also deals with removing flushes)

##### 7 Cards, Enumerating Degeneracy

With 7 cards we find ourselves with 4 degeneracy classes.

- no pair
- one pair
- two pair
- three of kind

When I was working this out on pen and paper I wrote out a table a bit like this to help me.
I'm using the slightly more general term "no duplicates" (rather than "no pairs") for the first case since with 7 cards we can now actually have triples.

| Degeneracy Class | $r_1$ | $r_2$ | $r_3$ | $r_4$ | $r_5$ | left over cards |
| ---------------- | ----- | ----- | ----- | ----- | ----- | --------------- |
| No Duplicates    | 1     | 1     | 1     | 1     | 1     | 2               |
| One Pair         | 2     | 1     | 1     | 1     | 1     | 1               |
| Two Pair         | 2     | 2     | 1     | 1     | 1     | 0               |
| Three of a kind  | 3     | 1     | 1     | 1     | 1     | 0               |

The $r_i$ are simply the ranks used in the straight.
What we have here is essentially a **multiset**.
A multiset is exactly what it says on the tin!
It's like a regular set except each item can appear more than once; each item can have a multiplicity (i.e. frequency) other than 1.
So for example in the "Two pair" row $r_1$ and $r_2$ both have a multiplicity of 2.

The above table has a weakness because it's only really showing a specific example of a straight in each case.
A better way to illustrate the multiset nature of the degeneracy classes is a table like this where we consider each degeneracy class to be equivalent to an integer partition of 7 that has at least 5 parts.
I also show the number of distinct ranks (which is basically 5 + "left over cards" from the previous table) in each case which will help us to count out different flavours of straight correctly.

| Degeneracy Class | multiplicity (partition of 7) | distinct rank |
| ---------------- | ----------------------------- | ------------- |
| No Duplicates    | $1{+}1{+}1{+}1{+}1{+}1{+}1$   | 7             |
| One Pair         | $2{+}1{+}1{+}1{+}1{+}1$       | 6             |
| Two Pair         | $2{+}2{+}1{+}1{+}1$           | 5             |
| Three of a kind  | $3{+}1{+}1{+}1{+}1$           | 5             |

As we are not savages we can use standard multiset notation to denote our multiplicities.
Please note that the things that look like powers actually denote _frequencies_ here, so $\{2^2,1^3\}$ means "2 twos and 3 ones" or in the language of poker "2 pairs and 3 high cards"

| Degeneracy Class | multiset      | distinct rank |
| ---------------- | ------------- | ------------- |
| No Duplicates    | $\{1^7\}$     | 7             |
| One Pair         | $\{2,1^5\}$   | 6             |
| Two Pair         | $\{2^2,1^3\}$ | 5             |
| Three of a kind  | $\{3,1^4\}$   | 5             |

Since I have used quite a bit of scala already it is natural for me to consider how we might model degeneracy classes as a scala type.
I quite like my scala types to be as precise as possible and there are several tools which help with this.
The main tools I use are refined types and smart constructors to help constrain my data types.
I'm using scala 3 for this blog post so I shall use [iron types](https://github.com/Iltotore/iron) (which I have not yet used at work actually!) and opaque types.
It took me a few iterations to get to a model that I was happy with so I think I'll just present it in its final form and explain why I did it this way.

To start with I thought about how we can precisely model the constituent parts of the multiset.
A multiset consists of `CardCount`s (i.e. how many cards have a particular rank) and `Frequencies` (how many times we see a rank with a particular `CardCount`.)
So the three of a kind example, $\{3,1^4\}$, has a `CardCount` of 3 with `Frequency` 1 (the triple) and a `CardCount` of 1 with `Frequency` 4 (the four singleton ranks.)
A `CardCount` must be between 1 and 4 because there are a maximum of 4 cards of each rank that can appear in a hand.
`Frequency` just has to be a positive number.
And then our `DegeneracyClass` is simply a `Map` with `CardCount` as its keys, and `Frequencies` as its values.
We can model this using iron types like so

```scala
object Degeneracy:

  type CardCount = Int :| Interval.Closed[1, 4]

  type Frequency = Int :| Positive

  opaque type DegeneracyClass = Map[CardCount, Frequency]
```

The reason to use refined types and not just `Int`s is that doing so makes it _impossible_ to construct an invalid `DegeneracyClass`, the compiler will not allow it!
So for example if I try to make something like

```scala
    def example: DegeneracyClass =
      Map((5: CardCount) -> (-9: Frequency))
```

I'll get a compile time error like

```sbt
[error] -- Error: /Users/paulstanford/repos-paul/stanosphere-blog/src/main/scala/stanosphere/balatro/model/Degeneracy.scala:33:11
[error] 33 |      Map((5: CardCount) -> (-9: Frequency))
[error]    |           ^
[error]    |-- Constraint Error --------------------------------------------------------
[error]    |Could not satisfy a constraint for type scala.Int.
[error]    |
[error]    |Value: 5
[error]    |Message: Should be included in [1, 4]
[error]    |----------------------------------------------------------------------------
[error]    |----------------------------------------------------------------------------
[error]    |Inline stack trace
[error]    |- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[error]    |This location contains code that was inlined from Degeneracy.scala:33
[error]     ----------------------------------------------------------------------------
[error] -- Error: /Users/paulstanford/repos-paul/stanosphere-blog/src/main/scala/stanosphere/balatro/model/Degeneracy.scala:33:29
[error] 33 |      Map((5: CardCount) -> (-9: Frequency))
[error]    |                             ^^
[error]    |-- Constraint Error --------------------------------------------------------
[error]    |Could not satisfy a constraint for type scala.Int.
[error]    |
[error]    |Value: -9
[error]    |Message: Should be strictly positive
[error]    |----------------------------------------------------------------------------
[error]    |----------------------------------------------------------------------------
[error]    |Inline stack trace
[error]    |- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[error]    |This location contains code that was inlined from Degeneracy.scala:33
[error]     ----------------------------------------------------------------------------
[error] two errors found
```

Which is cool and useful!
It means that once we've got into the world of `DegeneracyClass` we know that we're safe from all kinds of weirdness.

So how _do_ we construct a `DegeneracyClass`?
We can use a smart constructor to create one from a `List[Int]`.
So for example if I had something like `List(1, 1, 1, 2, 2)` we would expect to see a degeneracy class that looks a bit like `Map(1 -> 3, 2 -> 2)` because there are three singletons and two doubles.
Since we are using refined types we have to check the input is legit.
And since we're already checking the input we might as well check stuff that I can't think of a way to encode in the type system like the fact that we can't have fewer than 5 parts or more than 13 (a straight needs at least 5 distinct ranks, and of course there are only 13 ranks to begin with).

```scala
def fromParts(parts: List[Int]): Either[DegeneracyError, DegeneracyClass] =
  parts.length match
    case n if n < 5  => DegeneracyError.TooFewParts(n).asLeft[DegeneracyClass]
    case n if n > 13 => DegeneracyError.TooManyParts(n).asLeft[DegeneracyClass]
    case _           => parts.traverse(refineCardCount).map(toMultiset)

private def refineCardCount(part: Int) =
  part.refineEither[Interval.Closed[1, 4]].leftMap(_ => DegeneracyError.InvalidMultiplicity(part))

private def toMultiset(parts: List[CardCount]): DegeneracyClass =
  parts.groupMapReduce(identity)(Function.const(1: Frequency))(addFrequencies)

/* sadly scala doesn't have dependent types so we must assume that
  * adding two positive numbers gives a positive number
  */
private def addFrequencies(x: Frequency, y: Frequency): Frequency =
  (x + y).assume[Positive]
```

for this I've created an `enum` to keep tack of possible errors

```scala
enum DegeneracyError:
  case TooFewParts(count: Int)
  case TooManyParts(count: Int)
  case InvalidMultiplicity(value: Int)

object DegeneracyError:
  given Show[DegeneracyError] =
    Show.show {
      case TooFewParts(n)         => s"too few parts: a degeneracy class needs at least 5, got $n"
      case TooManyParts(n)        => s"too many parts: at most 13 (only 13 ranks), got $n"
      case InvalidMultiplicity(v) => s"invalid multiplicity $v: each must be in 1..4"
    }
```

that way anyone reading this code can, at a glance, know exactly what can go wrong when trying to construct a degeneracy class.
We can test all these cases if we want to.

```scala
class DegeneracyTest extends munit.FunSuite:
  test("DegeneracyClass.fromParts should work for a valid list of parts"):
    assertEquals(
      DegeneracyClass.fromParts(List(1, 1, 1, 2, 2)).map(_.toList),
      List(1 -> 3, 2 -> 2).asRight
    )

  test("DegeneracyClass.fromParts should return a suitable error if any of the parts are too big"):
    assertEquals(
      DegeneracyClass.fromParts(List(5, 1, 1, 2, 2)).map(_.toList),
      InvalidMultiplicity(5).asLeft
    )

  test("DegeneracyClass.fromParts should return a suitable error if there are too many parts"):
    assertEquals(
      DegeneracyClass.fromParts(List.fill(20)(1)).map(_.toList),
      TooManyParts(20).asLeft
    )

  test("DegeneracyClass.fromParts should return a suitable error if there are too few parts"):
    assertEquals(
      DegeneracyClass.fromParts(List(1, 2, 3)).map(_.toList),
      TooFewParts(3).asLeft
    )

end DegeneracyTest
```

Ok cool! But how do we _actually_ get hold of the degneracy classes for a particular hand size?
We can use integer partitions.
There are a couple of Project Euler problems to do with this (namely [problem 76](https://projecteuler.net/problem=76) and [problem 78](https://projecteuler.net/problem=78))!
So I can just recycle my previous answers.[^euler]

[^euler]: Like many people I've solved the first 100 Project Euler problems, in fact I put some of my solutions on YouTube to get myself used to talking through code before interviews lol

What we essentially want to do is figure out the different ways we make our hand size from singles, doubles, triples, and quaddies.
For example with 7 we have

$$
\begin{aligned}
7 &= 1 + 1 + 1 + 1 + 1 + 1 + 1 \\
7 &= 2 + 1 + 1 + 1 + 1 + 1 \\
7 &= 2 + 2 + 1 + 1 + 1 \\
7 &= 3 + 1 + 1 + 1 + 1
\end{aligned}
$$

Obviously we've seen this before in my table earlier on!
Now we just need to put it into code!

```scala
  def integerPartitions(n: Int, maxPart: Int): List[List[Int]] =
    if n == 0 then List(Nil)
    else
      for {
        part <- (1 to math.min(n, maxPart)).toList
        tail <- integerPartitions(n - part, part)
      } yield part :: tail
```

This is the simplest way I could come up with for generating integer partitions.
It's fairly simple recursion.
Once we get all the way down to 0 we know we're done since obviously 0 can't be written as an integer partition.
If we're not down to zero yet we must consider for our first part all numbers between 1 and 4 (i.e. `maxPart` will be set to 4 in the real usage of this function) and then all we do to get the other parts is call `integerPartitions` again!
We can check that this works for 7.

```scala
  test("Degeneracy.integerPartitions should produce valid partitions for 7"):
    assertEquals(
      Degeneracy.integerPartitions(7, 4),
      List(
        List(1, 1, 1, 1, 1, 1, 1),
        List(2, 1, 1, 1, 1, 1),
        List(2, 2, 1, 1, 1),
        List(2, 2, 2, 1),
        List(3, 1, 1, 1, 1),
        List(3, 2, 1, 1),
        List(3, 2, 2),
        List(3, 3, 1),
        List(4, 1, 1, 1),
        List(4, 2, 1),
        List(4, 3)
      )
    )
```

I suppose I could also write some property based tests that check the partitions really do add up to the number you feed into the functions!
My implementation of `integerPartitions` has obviously produced some partitions that are invalid for our case, remember we only care about partitions where we have 5 or more parts.
I'll not sully the rather lovely `integerPartitions` with more logic and will instead write

```scala
  def getDegeneracyClasses(handSize: Int): List[DegeneracyClass] =
    integerPartitions(handSize, maxPart = 4).mapFilter(DegeneracyClass.fromParts(_).toOption)
```

and have the `mapFilter` take care of getting rid of invalid parts.
Although I imagine that I could introduce a third parameter to `integerPartitions` called `minParts` to enforce this if I really wanted to.

I think rather than add some tests for `getDegeneracyClasses` it's more instructive to just print the answers, so I'll do that!

```scala
@main def degeneracyClassesDemo(): Unit =
  (5 to 8).iterator.foreach(showClasses)

private def showClasses(handSize: Int) = {
  val classes = Degeneracy.getDegeneracyClasses(handSize)

  println(s"found ${classes.length} degen classes for hand size of $handSize:")
  classes.map(_.show).map("  " + _).foreach(println)
  println
}
```

Gives me

```
found 1 degen classes for hand size of 5:
  {1⁵}

found 2 degen classes for hand size of 6:
  {1⁶}
  {2, 1⁴}

found 4 degen classes for hand size of 7:
  {1⁷}
  {2, 1⁵}
  {2², 1³}
  {3, 1⁴}

found 7 degen classes for hand size of 8:
  {1⁸}
  {2, 1⁶}
  {2², 1⁴}
  {2³, 1²}
  {3, 1⁵}
  {3, 2, 1³}
  {4, 1⁴}
```

So for a hand size of 7 we have no duplicates, a single pair, 2 pairs, and a triple.
For a hand size of 8 we have no duplicates, a single pair, 2 pairs, 3 pairs, a triple, full house, and 4 of a kind.

Now that I've mapped the maths to a scala type it's time to turn the crank on getting the straight counts for each degeneracy class using pen and paper.
This shouldn't be too difficult for a hand of 7, and I can always use that Math Overflow Answer to check my working!

##### 7 Cards, No Duplicates

For case with **no pairs** we can follow a very very similar argument to what we did when we only had 6 cards.
Once again we need to split by run length and this time there are of course 3 cases.

The simplest is when we have a 7 card straight.
We can start with anything from Ace through to 8 so there are 8 "shapes" here.
That was easy!

Next we'll tackle 6 card straights where the 7th card has a disjoint rank.
Recall that in total there are 9 straights with 6 cards.
Again we can separate by if the straight contains an Ace or not.
2 such straights do contain an Ace and for each of them there are 7 ranks we're not allowed to pick from which means there are 6 ranks we _are_ allowed to pick from.
The other 7 6-membered straights don't contain an Ace.
For each of them there are 8 ranks we're not allowed to pick the last rank from, so there are 5 that _are_ allowed.
This gives us a contribution of $2 \times 6 + 7 \times 5 = 12 + 35 = 47$

Finally we'll tackle the most complicated case where we have 5-membered straight and the remaining 2 cards have disjoint rank.
Remember we're only considering ranks here so the 2 cards that are not part of the straight will have different ranks to each other. The case where they have the same rank as each other will be covered in the next section.
Ok so we of course recall that there are 10 possible 5 card straights.
As usual we split them by whether or not they contain an Ace (2 do, 8 don't.)
For those that do contain an ace we may draw the 6th and 7th cards from a choice of 7 cards, so once again the binomial coefficient rears its head $\tbinom{7}{2}$
And for the 8 cases that don't contain an Ace we of course can only pick from 6 cards so we get $\tbinom{6}{2}$.
The contribution for 5 membered straights is therefore $2 \times \tbinom{7}{2} + 8 \times \tbinom{6}{2} = 2 \times 21 + 8 \times 15 = 42 + 120 = 162$

Great so adding all these up we get $8 + 47 + 162 = 217$ possible rank sets.
Put another way $S(\{1^7\}) = 217$.

Computing the suit combos is as simple as it was before since all the ranks are distinct, we pick up a factor of $4^7$ since each card can be any of the 4 suits. Therefore the final answer for straights in a **hand of 7 with no duplicate ranks** is $217 \times 4^7$ which is $3{,}555{,}328$

I was curious about a more general no-duplicates case; see the [appendix](#appendix) for more details.

##### 7 Cards, One Pair

We can have a 6 card straight or a 5 card straight. Hold up! Where have we seen this before???
We saw this in the previous ["6 Cards, No Pairs"](#6-cards-no-pairs) section.
Since I'm lazy I can just use the same reasoning as before and declare that there are 71 possible rank sets for this hand because it shares a property with the 6 card case.
In both cases we're essentially asking the same question.
And that question is "How many sets of 6 ranks contain a straight?"
We can see that this question depends only on the number of distinct ranks and not the full multiset structure!

In fact it's worth pausing and thinking about how we can simplify $S(d)$.
We now know that we only need to feed it the number of distinct ranks in the multiset, not the entire multiset.
Let's give a name to the "number of distinct ranks in a multiset", we can call it $r$.
And now we can deal with $S(r)$ rather than $S(d)$ going forwards!
You'll recall that earlier we said _"Whether or not a hand contains a straight depends only on the **set** of ranks in that hand."_
Remember that $S(r)$ is the component that captures the "straightness" of our hands, $P(d)$ and $Su(d)$ are just extra multiplicative factors about the details of how to realise a straight.
And so considering $S$ to be a function of $r$ alone makes perfect sense given our previous insight, we don't care about the **multi**set nature of our degeneracy classes, we only care about the **set** nature! We don't care about multiplicities at all for $S$, we have $P(d)$ and $Su(d)$ to care about multiplicites for us.

Speaking of $P$ and $Su$ we should actually go ahead and compute them for this case!
Let's start with $P(\{2,1^5\})$.
This is actually super duper easy since we have 6 distinct ranks we just pick up a factor of $6$ since we must choose which of these 6 ranks is doubled up.
$P(\{2,1^5\}) = 6$

For $Su(\{2,1^5\})$ the computation is also straightforward.
We pick up a factor of 4 for each of the 5 unpaired cards since each of them can be any of the four suits, so that's a factor of $4^5$.
For the paired cards we have to figure out how many ways can we choose a pair of suits from the 4 existing suits so that's just the binomial coefficient $\tbinom{4}{2}$. It's worth noting that our factors of 4 are technically also binomial coefficients, they're just $\tbinom{4}{1}$ though so obviously there's not much point writing that out in full every single time.

So in summary we have the following

$$
  \begin{aligned}
  &d = \{2, 1^5\} \\
  &r = 6 \\
  &S(r) = 71 \\
  &P(d) = 6 \\
  &Su(d) = \tbinom{4}{2} \times 4^5
  \end{aligned}
$$

##### 7 Cards, Two Pairs

Here we have $d = \{2^2, 1^3\}$ and so $r = 5$.
We already know that $S(5) = 10$ from when we considered making a straight using 5 cards.

For $P(d)$ we have to choose which 2 of our distinct ranks get to be pairs and we know we have 5 distinct ranks in total so it's just the binomial coefficient $\tbinom{5}{2}$.

For $Su(d)$ we have to assign the suits for each pair so we pick up a factors of $\tbinom{4}{2}$ for each pair.
We also need to assign the suits for each singleton card and we know there are 3 of them so that's a factor of $4^3$.
$Su(d) = \tbinom{4}{2}^2 \times 4^3$.

We can summarise again.

$$
  \begin{aligned}
  &d = \{2^2, 1^3\} \\
  &r = 5 \\
  &S(r) = 10 \\
  &P(d) = \tbinom{5}{2} \\
  &Su(d) = \tbinom{4}{2}^2 \times 4^3
  \end{aligned}
$$

This, like all things, is getting easier and easier with practice!

##### 7 Cards, Three of a Kind

This time I think I can just write down the answer and then justify it.

$$
  \begin{aligned}
  &d = \{3, 1^4\} \\
  &r = 5 \\
  &S(r) = 10 \\
  &P(d) = 5 \\
  &Su(d) = \tbinom{4}{3} \times 4^4
  \end{aligned}
$$

$S(r)$ is 10 for the same reason as the previous case. $P(d)$ is 5 because we must choose which of the 5 cards gets to be a triple. For the suit factor the binomial coefficient appears because we must choose 3 suits for the triple out of a possible 4 suits and each factor of 4 comes from choosing a suit for each of the four remaining cards.

##### 7 Cards, Putting it all together

Nice! So I've enumerated the degeneracy classes for 7 cards and then obtained expressions for $S$, $P$, and $Su$ for each case. I think it makes sense to put all of this in a nice little table and then I can finally go ahead and evaluate it and pray that it aligns with what the brute force computation gave us earlier.

| degen class     | multiset      | r   | S(r)  | P(d)                 | Su(d)                        |
| --------------- | ------------- | --- | ----- | -------------------- | ---------------------------- |
| No Duplicates   | $\{1^7\}$     | $7$ | $217$ | $1$                  | $4^7$                        |
| One Pair        | $\{2,1^5\}$   | $6$ | $71$  | $6$                  | $\tbinom{4}{2} \times 4^5$   |
| Two Pairs       | $\{2^2,1^3\}$ | $5$ | $10$  | $\tbinom{5}{2} = 10$ | $\tbinom{4}{2}^2 \times 4^3$ |
| Three of a Kind | $\{3,1^4\}$   | $5$ | $10$  | $5$                  | $\tbinom{4}{3} \times 4^4$   |

Cool! However to help spot patterns later it might be nice to explicitly write out the binomial coefficients involved in $P$ and $Su$.
At the same time I will go ahead and evaluate the expressions to get actual proper numbers too.
Finally I'll add a column at the end to take the product of $S$, $P$, and $Su$.

| degen class     | multiset      | r   | S(r)  | P(d)                 | Su(d)                                             | product         |
| --------------- | ------------- | --- | ----- | -------------------- | ------------------------------------------------- | --------------- |
| No Duplicates   | $\{1^7\}$     | $7$ | $217$ | $\tbinom{7}{0} = 1$  | $\tbinom{4}{1}^7 = 16{,}384$                      | $3{,}555{,}328$ |
| One Pair        | $\{2,1^5\}$   | $6$ | $71$  | $\tbinom{6}{1} = 6$  | $\tbinom{4}{2} \cdot \tbinom{4}{1}^5 = 6{,}144$   | $2{,}617{,}344$ |
| Two Pairs       | $\{2^2,1^3\}$ | $5$ | $10$  | $\tbinom{5}{2} = 10$ | $\tbinom{4}{2}^2 \cdot \tbinom{4}{1}^3 = 2{,}304$ | $230{,}400$     |
| Three of a Kind | $\{3,1^4\}$   | $5$ | $10$  | $\tbinom{5}{1} = 5$  | $\tbinom{4}{3} \cdot \tbinom{4}{1}^4 = 1{,}024$   | $51{,}200$      |
|                 |               |     |       |                      | **sum**                                           | $6{,}454{,}272$ |

And indeed the sum as computed from this table matches exactly the result from the brute force approach.
One of the things I have always found truly wonderful about maths is how there are often several different ways to get to a correct answer!
Of course I think this tabulation approach is much neater than the brute force since it describes where all the different ingredients come from, it tells us a little about the structure of the problem.

I find this table also aligns with my intuition about how $S$ and $Su$ work, they're both a heck of a lot bigger the less degeneracy you have.
For $S$ this makes sense because you literally have more distinct ranks to choose from so naturally there are more ways to make a straight.
And for $Su$ with more degeneracy your choices for suits are more constrained so the numbers get smaller and smaller.
$P$ behaves a little differently, it actually increases with the more choices you have for how many cards have some sort of degeneracy.
In this table we see that $P$ has its maximum when we have $2$ different ranks that have some sort of degeneracy which makes perfect sense because $P$ is all about assigning choices for which ranks get to be doubled up or tripled up (and eventually quadrupled up.)

##### A General Approach for Dealing with Degeneracy (Second Attempt)

Now that we have experience counting straights by hand it is reasonable to review the initial generalised procedure and see if we can come up with something slightly better, ideally better in the sense that it is easier to write in scala.

I think for me the easiest to translate into code is $Su(d)$.
We literally just look at the values in the multiset, pop them into the $k$ part of the binomial coefficient and raise them to the same power as seen in the multiset.
This makes sense because when we start having duplicates the choice of suits really is just "how do I choose the suits if I have $k$ cards that are the same", and that is the definition of a binomial coefficient.
In particular for a general multiset with a total of $t$ distinct elements

$$
\{ a_{1}^{m(a_{1})} , a_{2}^{m(a_{2})} , \ldots , a_{t}^{m(a_{t})}  \}
$$

where $m(a_i)$ is a function that gives the multiplicity of each element we can say

$$
Su(\{a_1^{m(a_1)}, \ldots, a_t^{m(a_t)}\}) = \prod_{i=1}^{t} \binom{4}{a_i}^{m(a_i)}
$$

In a way we're just replacing the values in our multiset with binomial coefficients and interpreting the multiplicities as powers.

Next up is $P(d)$.
All we do is look for elements in the multiset that are not 1 because those are the ones where we do have some degeneracy, where we do have some choices to make!
And then we go through and start thinking about how we assign them.
We've been kind of "lucky" so far in our treatment because we've only seen multisets with at most two distinct elements.
So let's up the ante and think about something a bit richer.

I guess I want something that's got at least 3 distinct elements and also some of the 2s, 3s, or 4s should have powers bigger than one!
Ok something like $\{3, 2^2, 1^2\}$.
That's a hand with a triple and 2 pairs (a full mansion lol?)
Right so the way to work out $P$ is pretty straightforward.
We first note that there are 5 distinct ranks there (the powers add up to 5.)
So to choose which rank is tripled we pick up a factor of 5, and then there are 4 ranks left, 2 of which could be pairs so we pick up a factor of $\tbinom{4}{2}$.
Alternatively we could have decided to assign the pairs first giving us $\tbinom{5}{2}$ since we're choosing which two of the five distinct ranks get to be pairs, and then we pick up a factor of 3 because we must choose which of the three remaining distinct ranks gets tripled.
Either way the answer is $30$.

But is there _another_ way to get to this answer where we don't really have to make a choice about which degenerate ranks get assigned first?
The answer is yes, we just have to think about this in a slightly different way.

Let's go way back to when I introduced binomial coefficients and think about the problem in that way.
Recall that we have 1 triple, 2 pairs (call then pair A and pair B), and 2 singles (call them single A and single B) and we want to assign which rank plays which role.
There are 5 ranks (call them $r_1 ... r_5$) in total and so there are $5!$ ways of arranging those ranks.
Now imagine that for each arrangement of ranks I've written out "pair A, pair B, single A, single B, triple" below them.
Actually don't imagine that, just the look at this table.

| $r_1$  | $r_2$  | $r_3$    | $r_4$    | $r_5$  |
| ------ | ------ | -------- | -------- | ------ |
| pair A | pair B | single A | single B | triple |

In that table I've assigned $r_1$ to pair A and $r_2$ to pair B. But what if instead I'd assigned $r_1$ to pair B and $r_2$ to pair A?
Like I have in the table below?

| $r_2$  | $r_1$  | $r_3$    | $r_4$    | $r_5$  |
| ------ | ------ | -------- | -------- | ------ |
| pair A | pair B | single A | single B | triple |

Well those are still equivalent placements, in both cases $r_1$ and $r_2$ each get the pleasure of being pairs.
To put it concretely if $r_1$ is a Queen and $r_2$ is a King in both cases you've got a pair of Kings and a pair of Queens.
So it doesn't matter if I swap the pairs around, so I can divide by $2!$.
In the same way it does't matter if I swap the singles around so I get another factor of $2!$ to divide by, huge!
So overall I end up with $5! / (2! \cdot 2!) = 120 / (2 \cdot 2) = 120 / 4 = 30$
In general if I had, say 5 singles, 2 pair and 3 triples I'd be dividing by $5! \cdot 2! \cdot 3!$.
And this is precisely the definition of a [multinomial coefficient](https://en.wikipedia.org/wiki/Multinomial_theorem)!

A multinomial coefficient looks like

$$
\binom{n}{k_{1}, k_{2}, \ldots, k_{m}} = \frac{n!}{k_{1}! k_{2}! \cdots k_{m}!}
$$

So $P(d)$ was actually just a multinomial coefficient all along!

And this kind of makes sense.
As wikipedia says

> The multinomial coefficient
> $$\binom{n}{k_1, k_2, \ldots, k_m}$$
> is also the number of distinct ways to permute a multiset of $n$ elements, where $k_i$ is the multiplicity of each of the $i$th element.

And that, really, is all we've been caring about, this exactly corresponds to the number of placements for our degenerate ranks.
I really do enjoy it when things come together nicely like this.

In particular for our general multiset

$$
\{ a_{1}^{m(a_{1})} , a_{2}^{m(a_{2})} , \ldots , a_{t}^{m(a_{t})}  \}
$$

we can say

$$
P(\{a_1^{m(a_1)},a_2^{m(a_2)} \ldots, a_t^{m(a_t)}\}) = \binom{r}{m(a_1),m(a_2), \ldots, m(a_t)} = \frac{r!}{m(a_1)!m(a_2)!\cdots m(a_t)!}
$$

where of course

$$
r = \sum_{i=1}^{t} m(a_i)
$$

It is notable that $P$ depends only on the powers in the multiset, not the values whereas $Su$ depended on both the values and the powers.

Right so that's $P$ and $Su$ nailed, we have some lovely mathematical formulae for each.
Now for $S$.
Sadly I can't come up with an elegant formula for $S$.
Why not? Well I think maybe a formula does exist but it would be pretty gnarly.
In a sense $S$ is what encodes the (conceptual) complexity of our problem, it's the thing that counts straightness.
The other formulae are simple because they are really all about independent choices.
They're just assigning multiplicities and suits given that we have a straight.
Counting straights is difficult because there's not really a mathematical way to reduce the problem down, you kind of just have to check if any 5 of your card's ranks form a nice sequence.

And so rather than trying to construct a mathematical formula to figure out $S(d)$ I will turn instead to my computer, to brute force.
Finding nice formulae for $P(d)$ and $Su(d)$ is helpful because it now means that rather than brute forcing the whole thing I can now use brute force on a much smaller space.
I can now just count distinct rank sets using brute force and multiply by $P$ and $Su$ rather than using brute force to find all possible individual straights!

### A More Nuanced Computational Approach

In the previous section I split up the problem.
In case it was too mathematical/tedious to read the overall approach is

1. enumerate the degeneracy class for your hand, $d$
2. cast each into a wonderful multiset
3. for each degeneracy class (multiset) compute the following quantities and multiply them together
   - $S(d)$, the number of rank sets that contain a straight, I have been unable to find a nice formula for this so will use brute force instead
   - $P(d)$, the number of placements of the ranks, which has a nice formula
   - $Su(d)$, the number of suit combinations for the degeneracy, which has a nice formula based only on the multiplicities of the elements in the multiset
4. add up the results of each degeneracy class

Now the time has come to translate this into code.
When writing code for this sort of thing I am a top-down enjoyer.
I can define my top level function as a composition of smaller functions and then either go ahead and implement said functions or further break them down into compositions of yet-smaller functions.
Am I overusing the word function? Anyway let's start with a top level `def`.

```scala
object StraightCounter:

  def computeStraightCount(handSize: Int): Long =
    getDegeneracyClasses(handSize)
      .foldMap(c => countStraightRankSets(c) * placementFactor(c) * suitFactor(c))

  def countStraightRankSets(degenClass: DegeneracyClass): Long = ???

  def placementFactor(degenClass: DegeneracyClass): Long = ???

  def suitFactor(degenClass: DegeneracyClass): Long = ???
```

Where `???` is just syntactic sugar for `throw new NotImplementedError`, lots of people like to use it to indicate "implementing this is a problem for future me".
If you haven't seen `foldMap` before all it does is apply the mapping function to all the elements in the list and combines all the results together as it goes, in our casing "combining" is literally just integer addition of course.
I could well have just written

```scala
  def computeStraightCount(handSize: Int): Long =
    getDegeneracyClasses(handSize)
      .map(c => countStraightRankSets(c) * placementFactor(c) * suitFactor(c))
      .sum
```

Which requires two passes whereas `foldMap` just requires the one.

Anyway I guess let's first focus on the components that I have already derived a formula for. Once again we can go top down.

```scala
  def placementFactor(degenClass: DegeneracyClass): Long =
    multinomial(degenClass.distinctRanks, degenClass.frequencies)

  def suitFactor(degenClass: DegeneracyClass): Long =
    degenClass.toList
      .foldMap { case (degeneracy, frequency) =>
        binomial(4, degeneracy) `pow` frequency
      }(using Monoid.instance(1L, _ * _))

  def binomial(n: Int, k: Int): Long = ???

  def multinomial(n: Int, ks: List[Int]): Long = ???
```

For `placementFactor` we just grab the `distinctRanks` and `frequencies` straight from the degeneracy class and pop them in to a `multinomial` function.
So I've defined `distinctRanks` and `frequencies` as extension methods on my `DegeneracyClass`

```scala
  extension (d: DegeneracyClass)

    def distinctRanks: Int =
      d.values.sum

    def frequencies: List[Frequency] =
      d.values.toList
```

For `suitFactor`, just like the maths, I'm converting each frequency I see into a binomial coefficient, raising it to the power of its frequency, and then multiplying them all together.
To do the multiplication I use `foldMap` again but I use a different `Monoid` instance to make sure I multiply rather than add.
All the `Monoid` instance really does is specify how to combine elements, and what the "neutral" element is.
Once again I could (and perhaps should) just write this as

```scala
  def suitFactor(degenClass: DegeneracyClass): Long =
    degenClass.toList
      .map((degeneracy, frequency) => binomial(4, degeneracy) `pow` frequency)
      .product
```

but I am apparently addicted to `foldMap`.
I do think that once your start using `Monoid` they become the natural way that you think about combining things so that perhaps explains my addiction!
You might also note that `pow` is not defined on `Long`s in the standard library, so I defined it myself by wrapping the `BigInt` implementation.

```scala
  extension (l: Long)
    def pow(exponent: Int): Long =
      BigInt(l).pow(exponent).toLong
```

Ok so now we just need to go ahead and implement the two combinatorial functions and then we can probably go home.
They are of course both defined in terms of `factorial`.

```scala

  def binomial(n: Int, k: Int): Long =
    (factorial(n) / factorial(n - k) / factorial(k)).toLong

  def multinomial(n: Int, ks: List[Int]): Long =
    (factorial(n) / ks.foldMap(factorial)(using Monoid.instance(BigInt(1), _ * _))).toLong

  def factorial(n: Int): BigInt =
    (1 to n).toList.foldMap(BigInt.apply)(using Monoid.instance(BigInt(1), _ * _))
```

There's not really too much to explain here tbh.
Although it has now occurred to me that you could feed nonsensical arguments to `multinomial`.
All the `ks` should of course add up to `n`.
I could add a constraint or have it return an `Either` or something but the simplest choice is probably just to remove `n` altogether as an arg and have the function derive it by doing `ks.sum`!

```scala
  def multinomial(ks: List[Int]): Long =
    (factorial(ks.sum) / ks.foldMap(factorial)(using Monoid.instance(BigInt(1), _ * _))).toLong
```

All told we now have.

```scala
object StraightCounter:

  def computeStraightCount(handSize: Int): Long =
    getDegeneracyClasses(handSize)
      .foldMap(c => countStraightRankSets(c) * placementFactor(c) * suitFactor(c))

  def countStraightRankSets(degenClass: DegeneracyClass): Long = ???

  def placementFactor(degenClass: DegeneracyClass): Long =
    multinomial(degenClass.frequencies)

  def suitFactor(degenClass: DegeneracyClass): Long =
    degenClass.toList
      .foldMap { case (degeneracy, frequency) =>
        binomial(4, degeneracy) `pow` frequency
      }(using Monoid.instance(1L, _ * _))

  def factorial(n: Int): BigInt =
    (1 to n).toList.foldMap(BigInt.apply)(using Monoid.instance(BigInt(1), _ * _))

  def binomial(n: Int, k: Int): Long =
    (factorial(n) / factorial(n - k) / factorial(k)).toLong

  def multinomial(ks: List[Int]): Long =
    (factorial(ks.sum) / ks.foldMap(factorial)(using Monoid.instance(BigInt(1), _ * _))).toLong

  extension (l: Long)
    def pow(exponent: Int): Long =
      BigInt(l).pow(exponent).toLong

end StraightCounter
```

There's just one hole left, the infamous $S(r)$
I shall once again turn to recursion to solve this.
To set the scene I will define two wrappers for the real function, and a type alias to work with.
In reality for this case I actually did go more bottom up, so I defined `rankSetsWithStraight` first!

```scala
object RankSetsWithStraightCounter:

  type RankSet = Set[Rank]

  def countStraightRankSets(degenClass: DegeneracyClass): Int =
    rankSetsWithStraight(degenClass.distinctRanks).size

  def countStraightRankSets(r: Int): Int =
    rankSetsWithStraight(r).size

  private def rankSetsWithStraight(n: Int): Set[RankSet] = ???

end RankSetsWithStraightCounter
```

The first overload of course corresponds to the old $S(d)$ notion, before I realised $S$ need only depend on $r$.
The second overload corresponds to $S(r)$.

My idea for how to implement this was I would start with the simplest case, a hand with 5 distinct ranks, and then to work out how many `RankSet`s we have for a hand with 6 distinct ranks I can build them from my hands with 5 distinct ranks as a starting point.
And by induction/recursion we can do this for 7, 8, ... 13.
It is of course impossible to have a straight that uses 14 ranks.
Ok great!

So the base case then is getting all the rank sets that form a straight or a hand with 5 cards.
That's fairly easy, as discussed we know there are ten of them, and here's that put into code.

```scala
  type RankSet = Set[Rank]

  // there are ten straights of five ranks starting from Ace to Ten
  private lazy val allFiveRankStraights: Set[RankSet] =
    Iterator.iterate(Rank.Ace)(_.nextRank).take(10).map(mkFiveCardStraight).toSet

  private def mkFiveCardStraight(startingRank: Rank): RankSet =
    Iterator.iterate(startingRank)(_.nextRank).take(5).toSet

  extension (r: Rank)
    private def nextRank: Rank =
      Rank.fromOrdinal((r.ordinal + 1) % 13)
```

Nothing too crazy there!

Now we need our recursive/inductive step.
To make a straight using `n + 1` distinct ranks we just look at all the straights of `n` ranks and for each such straight we grab all of the ranks _not_ seen in that straight and combine each of these other ranks with the original straight.
This is guaranteed to always give us a straight with `n + 1` ranks because adding another rank to a straight keeps a hand as a straight no matter what, it might make it into a straight with length `n + 1`, or it might make it into a straight of length `n` with just some random disjoint rank lying around, either way its a straight.
And because we've carefully chosen our other rank to be different from the ranks present in the hand of size `n` we know we definitely get a hand of size `n + 1`.
In code this looks like

```scala
object RankSetsWithStraightCounter:

  type RankSet = Set[Rank]

  def countStraightRankSets(degenClass: DegeneracyClass): Int =
    rankSetsWithStraight(degenClass.distinctRanks).size

  def countStraightRankSets(r: Int): Int =
    rankSetsWithStraight(r).size

  private def rankSetsWithStraight(n: Int): Set[RankSet] =
    if n < 5 then Set.empty
    else if n == 5 then allFiveRankStraights
    else
      for
        rankSet   <- rankSetsWithStraight(n - 1)
        otherRank <- otherRanks(rankSet)
      yield rankSet + otherRank

  // there are ten straights of five ranks starting from Ace to Ten
  private lazy val allFiveRankStraights: Set[RankSet] =
    Iterator.iterate(Rank.Ace)(_.nextRank).take(10).map(mkFiveCardStraight).toSet

  private def mkFiveCardStraight(startingRank: Rank): RankSet =
    Iterator.iterate(startingRank)(_.nextRank).take(5).toSet

  private def otherRanks(ranks: RankSet): Set[Rank] =
    allRanks diff ranks

  private val allRanks: Set[Rank] =
    Rank.values.toList.toSet

  extension (r: Rank)
    private def nextRank: Rank =
      Rank.fromOrdinal((r.ordinal + 1) % 13)

end RankSetsWithStraightCounter
```

where I've kind of used two base cases rather than one but it's my code so I'll do as I wish!

We can check this like so

```scala
@main def demoCountStraightRankSets(): Unit =
  (5 to 13)
    .map(n => n -> RankSetsWithStraightCounter.countStraightRankSets(n))
    .foreach(println)
```

which produces

```
(5,10)
(6,71)
(7,217)
(8,371)
(9,384)
(10,234)
(11,77)
(12,13)
(13,1)
```

where of course 10, 71, and 217 match our findings from turning the crank by hand.

I naturaly typed this in to [The On-Line Encyclopedia of Integer Sequences (OEIS)](https://oeis.org/) but it seems not to correspond to a known sequence.
To me it is somewhat reminisiscent of a row in Pascal's triangle (e.g. 1, 7, 21, 35, 35, 21, 7, 1) in the sense that it starts small, gets big in the middle and crashes back down again.
This is surely just a superficial simmilarity.

Ok I am now ready to include this in the main file. Huge moment.

```scala
object StraightCounter:

  def computeStraightCount(handSize: Int): Long =
    getDegeneracyClasses(handSize)
      .foldMap(c => countStraightRankSets(c) * placementFactor(c) * suitFactor(c))

  def countStraightRankSets(degenClass: DegeneracyClass): Long =
    RankSetsWithStraightCounter.countStraightRankSets(degenClass)

  def placementFactor(degenClass: DegeneracyClass): Long =
    multinomial(degenClass.frequencies)

  def suitFactor(degenClass: DegeneracyClass): Long =
    degenClass.toList
      .foldMap { case (degeneracy, frequency) =>
        binomial(4, degeneracy) `pow` frequency
      }(using Monoid.instance(1L, _ * _))
```

And now, finally, we can take it for a spin

```scala
@main def computeAll() =
  println {
    (5 to 13).iterator
      .map(n => n -> StraightCounter.computeStraightCount(n))
      .map { case (n, straightCount) => s"| $$$n$$ | $$${straightCount.toLatex}$$ |" }
      .mkString("| Hand size | Hands containing a straight |\n |-|-| \n", "\n", "")
  }
```

| Hand size | Hands containing a straight |
| --------- | --------------------------- |
| $5$       | $10{,}240$                  |
| $6$       | $367{,}616$                 |
| $7$       | $6{,}454{,}272$             |
| $8$       | $73{,}870{,}336$            |
| $9$       | $619{,}588{,}736$           |
| $10$      | $4{,}051{,}217{,}344$       |
| $11$      | $21{,}461{,}806{,}976$      |
| $12$      | $94{,}674{,}009{,}184$      |
| $13$      | $355{,}161{,}047{,}872$     |

You will no doubt recall the answers from the brute force approach

| Hand size | Total hands       | Hands containing a straight | Probability of a straight |
| --------- | ----------------- | --------------------------- | ------------------------- |
| $5$       | $2{,}598{,}960$   | $10{,}240$                  | $0.39\%$                  |
| $6$       | $20{,}358{,}520$  | $367{,}616$                 | $1.81\%$                  |
| $7$       | $133{,}784{,}560$ | $6{,}454{,}272$             | $4.82\%$                  |
| $8$       | $752{,}538{,}150$ | $73{,}870{,}336$            | $9.82\%$                  |

For our final table let's also include the "Total Hands" and probability cols, and then I will allow myself to go to bed.
I'll not show you the horrible late-night code I used to create this table.

| Hand size | Total hands             | Hands containing a straight | Approx odds           | Probability of a straight |
| --------- | ----------------------- | --------------------------- | --------------------- | ------------------------- |
| $5$       | $2{,}598{,}960$         | $10{,}240$                  | $1 \text{ in } 253.8$ | $0.39\%$                  |
| $6$       | $20{,}358{,}520$        | $367{,}616$                 | $1 \text{ in } 55.4$  | $1.81\%$                  |
| $7$       | $133{,}784{,}560$       | $6{,}454{,}272$             | $1 \text{ in } 20.7$  | $4.82\%$                  |
| $8$       | $752{,}538{,}150$       | $73{,}870{,}336$            | $1 \text{ in } 10.2$  | $9.82\%$                  |
| $9$       | $3{,}679{,}075{,}400$   | $619{,}588{,}736$           | $1 \text{ in } 5.9$   | $16.84\%$                 |
| $10$      | $15{,}820{,}024{,}220$  | $4{,}051{,}217{,}344$       | $1 \text{ in } 3.9$   | $25.61\%$                 |
| $11$      | $60{,}403{,}728{,}840$  | $21{,}461{,}806{,}976$      | $1 \text{ in } 2.8$   | $35.53\%$                 |
| $12$      | $206{,}379{,}406{,}870$ | $94{,}674{,}009{,}184$      | $1 \text{ in } 2.2$   | $45.87\%$                 |
| $13$      | $635{,}013{,}559{,}600$ | $355{,}161{,}047{,}872$     | $1 \text{ in } 1.8$   | $55.93\%$                 |

### Conclusions for Normal Straights

Wow! That was quite the journey wasn't it, I certainly didn't think I would write so much about normal straights before actually trying to answer my original question.
I am easily distracted.
So what do I actually have to show from all of the above?
I effectively have three ways to count straights

1. Pure Brute Force (the Bobby B)
2. Pure Pen and Paper Maths (the Samwell Tarly)
3. A hybrid approach (the Oberyn Martell)

I like to think I approached this in a sensible way: I first created a well tested approach that is, I hope, easy to understand but is also deeply inefficient.
After that I did some research and was able to adapt a really good maths overflow answer to help build some intuition about the problem.
I think the pure mathematical approach is slightly more complicated than pure brute force but it also has a neatness to it in the way that it splits each straight into nice tangible classes.
Whilst doing the pen and paper work I came to the realisation that the technique could be split up into 3 key independent components

1.  $S(d)$, the number of rank sets that contain a straight, I had to use my computer for this
2.  $P(d)$, the number of placements of the ranks, which has a nice formula
3.  $Su(d)$, the number of suit combinations for the degeneracy, which has a nice formula based only on the multiplicities of the elements in the multiset

For me working on this problem that I randomly set myself reinforces the idea that finding an easily understandable but inefficient brute force solution is extremely useful for verifying your work on a more nuanced solution.
If someone can't understand your solution to a problem then it's fairly useless to them!
I do think my more nuanced approach is _also_ understandable but it requires a heck of a lot more thinking to see its correctness.

On that point I strongly suspect that Claude or other LLMs could produce a solution to this problem that is computationally more efficient than mine!
But I do wonder if they would take the same structured approach that I did based on that Math Overflow answer?
Would an AI's solution be easier to understand than my own?
If I had just used AI to blast out a solution to this problem I very much doubt I would have learnt anything.
I wouldn't have learnt about **multisets** or **multinomial coefficients** if the AI used a different approach to me.
And even if it _did_ use such an approach would I have gained the same understanding I gained by knuckling down and working it out for myself?
I solved this problem not because I care greatly about the solution but I because I thought attempting it would be fun!
And it was!
It is debatable whether reading about my solution is fun.

Perhaps a secondary reason I chose to do all this maths and all this scala in my spare time is that I don't really have the same "thrill" I used to get at work before AI was popular.
AI probably makes me a more productive developer in the sense that I write and ship more code than I did before.
But I do not get the same enjoyment out of my job that I used to.
I also fear that my coding skills have atrophied a little.
I have turned some of my thinking over to machines.
You can ask Frank Herbert about what happens next.

It could be that the solution is for me to abandon using AI at work, to do things organically again (in fact I sometimes joke that a PR of mine is "organic" when I haven't used AI at all for it.)
My concern is that I will fall behind my colleagues who _do_ make good use of AI as a force multiplier, and if the future is more AI I'd better learn how to use it well, lest I be left behind.
To be clear I think AI has its place [^ai], it's just that for me it seems to be slowly eating away at the parts of my job that I used to enjoy the most.
It is of course a rare privilege to enjoy one's job so perhaps I shouldn't complain too much, at least I can look back on a time when work really was fun for me.

[^ai]: In fact I used AI to sort out the styling of this blog post because I can't write CSS to save my life. The content, however, is mine.

Now that the mandatory "woe is me" paragraph has been written another interesting conclusion that I have is that this is far from the end of the calculations we could do!
It is worth remembering that everything I have done has been considering only a standard deck which is of course _not_ what you have in Balatro.
In fact even if you did have a standard deck all of the calculations so far only work for the _first hand_ you draw.
After that they're useless.
However, I think we can all agree that this post is more than long enough as it is so this is perhaps an investigation I will do another time.

## Gappy Straights

Now that we have rather exhaustively investigated garden variety straights we may turn our attention to straights with gaps of one. In the previous section I effectively created a simple algorithm for counting the straights.
Of the three parts of that algorithm the only part that actually corresponds to "straightness" was of course $S(r)$ (i.e. `countStraightRankSets`) and so that is the only part we need to change when considering gappy straights, the placement and suit factors remain unchanged.

So let's remind ourselves of how that shortcut joker works.

> Shortcut allows Straights to be made with one or more gaps of 1 rank between cards (ex: 2 4 5 7 9).

The key part is **one or more** gaps.
Before diving in to generalising `countStraightRankSets` I think it makes sense to quickly write out a brute force solution for this!

### Brute Force

Let us recall how I did this for normal straights.
All I did was generate all possible hands and then count how many hands `containsStraight` returns `true` for, as a reminder `containsStraight` looks like this.

```scala
  def containsStraight(hand: List[Card]): Boolean = {
    val sortedHand =
      hand.map(_.rank).distinct.sorted

    def containsConsecutiveRun(sortedRanks: List[Rank]) =
      sortedRanks.length >= 5 &&
        sortedRanks
          .sliding(5)
          .exists { window =>

            val lowest  = window.head.ordinal
            val highest = window.last.ordinal

            highest == lowest + 4
          }

    def containsConsecutiveRunWithHighAce(sortedRanks: List[Rank]) =
      sortedRanks.length >= 5 &&
        sortedRanks.head == Rank.Ace &&
        sortedRanks.takeRight(4) == Rank.values.toList.takeRight(4)

    containsConsecutiveRun(sortedHand) || containsConsecutiveRunWithHighAce(sortedHand)
  }
```

At first I thought maybe I could bascially subtelly change the `highest == lowest + 4` logic to an inequality.
One bound of the inequality would of course just `highest == lowest + 4` which obviously corresponds to no gaps at all.
And the other bound would be if we have maximal gaps (so for example A, 3, 5, 7, 9) which would be equivalent to `highest == lowest + 8`.
Butttt this would get ruined by a case like (A, 2, 3, 4, 9.)
So I don't think I can just look at the highest and lowest ranks as above sadly, need just one more `sliding` bro I promise.
So bascially all I'm going to do is the same as above but for each set of 5 distinct ranks I have I simply check if there's a gap of at most 1.
I'll also slightly change how I handle the speical Ace High logic since I can't relaly pattern match in the same way as above, I can do this by converting everything to ordinals and if my hand does have an Ace in it I'll add a special ordinal for that Ace that's just one higher than a King's which effectively treats it as high!

```scala
  val aceHighOrdinal = Rank.King.ordinal + 1

  extension [A](xs: List[A])
    def slidingPairs: Iterator[(A, A)] =
      xs.sliding(2).map {
        case x1 :: x2 :: Nil => (x1, x2)
        case _               => throw new IllegalArgumentException("list needs to have at least 2 elements!")
      }

  def containsGappyStraight(hand: List[Card]): Boolean = {
    def containsGappyRun(sortedOrdinals: List[Int]) =
      sortedOrdinals.length >= 5 &&
        sortedOrdinals
          .sliding(5)
          .exists(_.slidingPairs.forall { case (lo, hi) => hi - lo <= 2 })

    val aceLowOrdinals       = hand.map(_.rank.ordinal).distinct.sorted
    lazy val aceHighOrdinals = aceLowOrdinals.drop(1) ++ List(aceHighOrdinal)

    if hand.map(_.rank).contains(Rank.Ace)
    then containsGappyRun(aceLowOrdinals) || containsGappyRun(aceHighOrdinals)
    else containsGappyRun(aceLowOrdinals)
  }
```

If I was being a good boy I'd write tests as I did with the normal straight case.
But instead I'm going to use my confidence and just assert that the above is correct.
So if I go ahead and run it for hands of size 5,6,7,8 then I get a table like this.

| Hand size | Total hands       | Hands containing a straight | Probability of a straight |
| --------- | ----------------- | --------------------------- | ------------------------- |
| $5$       | $2{,}598{,}960$   | $131{,}072$                 | $5.04\%$                  |
| $6$       | $20{,}358{,}520$  | $3{,}342{,}336$             | $16.42\%$                 |
| $7$       | $133{,}784{,}560$ | $42{,}795{,}008$            | $31.99\%$                 |
| $8$       | $752{,}538{,}150$ | $366{,}608{,}384$           | $48.72\%$                 |

So actually the chances of getting a straight is roughly 50-50 if you have a standard deck!
Whilst I'm not a particularly skilled Balatro player I would have made an effort to alter my deck to increase the chances of getting a straight so really $48.72\%$ is a lower bound for getting a straight in your first hand!

It is obvious that we can generalise my `containsGappyStraight` function to add `maxGap` as a param.

```scala
  def containsGappyStraight(hand: List[Card], maxGap: Int): Boolean = {
    def containsGappyRun(sortedOrdinals: List[Int]) =
      sortedOrdinals.length >= 5 &&
        sortedOrdinals
          .sliding(5)
          .exists(_.slidingPairs.forall { case (lo, hi) => hi - lo <= maxGap + 1 })

    val aceLowOrdinals       = hand.map(_.rank.ordinal).distinct.sorted
    lazy val aceHighOrdinals = aceLowOrdinals.drop(1) ++ List(aceHighOrdinal)

    if hand.map(_.rank).contains(Rank.Ace)
    then containsGappyRun(aceLowOrdinals) || containsGappyRun(aceHighOrdinals)
    else containsGappyRun(aceLowOrdinals)
  }
```

This'll work for the normal starights and gappy straights.
And it'll work for bigger gaps too of course.
As far as I know [^other_jokers] there aren't more powerful versions of the shortcut Joker (some sort of wormhole space warping Joker comes to mind.)
In fact it might be possible to create such a Wormhole Joker using the [Joker Forge](https://github.com/Jaydchw/joker-forge) but I've not yet looked at it in details!
Anyway we have the ingredients needed to see what happens for larger gaps so I'll go ahead and tabulate that.
This obviously took quite some time to run on my computer!

[^other_jokers]: I am dedicated enough that I have unlocked all the jokers so I'm fairly confident in my knowledge here

| Hand size | Gap size $0$ | Gap size $1$ | Gap size $2$ | Gap size $3$ | Gap size $4$ |
| --------- | ------------ | ------------ | ------------ | ------------ | ------------ |
| $5$       | $0.39\%$     | $5.04\%$     | $18.56\%$    | $33.69\%$    | $43.26\%$    |
| $6$       | $1.81\%$     | $16.42\%$    | $41.95\%$    | $62.84\%$    | $74.68\%$    |
| $7$       | $4.82\%$     | $31.99\%$    | $62.07\%$    | $80.36\%$    | $89.56\%$    |
| $8$       | $9.82\%$     | $48.72\%$    | $76.83\%$    | $89.87\%$    | $95.71\%$    |

### Computer Assisted Combinatoric Approach

As discussed this will amount to generalising `countStraightRankSets`, and we can check the results against the brute force approach in the previous section (although to be fair I never actually properly verified the correctness of the vrute force results.)
As a reminder the final form of `countStraightRankSets` was.

```scala
object RankSetsWithStraightCounter:

  type RankSet = Set[Rank]

  def countStraightRankSets(degenClass: DegeneracyClass): Int =
    rankSetsWithStraight(degenClass.distinctRanks).size

  def countStraightRankSets(r: Int): Int =
    rankSetsWithStraight(r).size

  private def rankSetsWithStraight(n: Int): Set[RankSet] =
    if n < 5 then Set.empty
    else if n == 5 then allFiveRankStraights
    else
      for
        rankSet   <- rankSetsWithStraight(n - 1)
        otherRank <- otherRanks(rankSet)
      yield rankSet + otherRank

  // there are ten straights of five ranks starting from Ace to Ten
  private lazy val allFiveRankStraights: Set[RankSet] =
    Iterator.iterate(Rank.Ace)(_.nextRank).take(10).map(mkFiveCardStraight).toSet

  private def mkFiveCardStraight(startingRank: Rank): RankSet =
    Iterator.iterate(startingRank)(_.nextRank).take(5).toSet

  private def otherRanks(ranks: RankSet): Set[Rank] =
    allRanks diff ranks

  private val allRanks: Set[Rank] =
    Rank.values.toList.toSet

  extension (r: Rank)
    private def nextRank: Rank =
      Rank.fromOrdinal((r.ordinal + 1) % 13)

end RankSetsWithStraightCounter
```

The key principal being that we built more complicated straights out of smaller straights.
So the rules have to change to allow for a greater variety in the base case, we'll have more than the standard 10 starting straights.
But the rules for adding new cards is actually the same, we know that adding a new distinct rank to an exisiting rank set that already contains a straight automatically gives us a new rank set that must still contain a straight.
So the challenge really is finding the "primitive" gappy straights.
I guess we can simplify by only considering the gappy straights that start with an Ace (e.g. A,2,3,4,5; A,3,4,5,6; ...) and once that's sorted we can apply the same logic to straights starting with 2, right the way up to 10 (there'll still only be one answer starting from 10 of course!)
Well actually to get straights that start with something other than an Ace we can just increase the rank of all cards by 1 and check that we've not hit an illegal state where the highest card is higher than an Ace but I'm rather getting ahead of myself.

Ok so to construct a gappy straight starting with an Ace all we have to do is pick the next card in our gappy straight.
It can either be a 2 or a 3, cool!
Now we have two states: {A,2} and {A,3}.
For each state we again just pick the next card, so in pseudo code this gives something like

```
{A,2} -> {A,2,3}, {A,2,4}
{A,3} -> {A,3,4}, {A,3,5}
```

We now have 4 states and we want to pick possible 4th cards in each case, you get the idea.
I'll basically build up a binary tree of possible states until I hit 5 cards (I suppose really it's more of a [trie](https://en.wikipedia.org/wiki/Trie) of depth 5 where the root node is A and edges are always +1 and +2 which results in the leaf nodes being all straights with gaps of at most 1.)
I'll write the code first and then we can maybe visulaise it as a trie just for a laugh!

I'll redefine `RankSet` to use a `SortedSet` so that I can easily grab the biggest elem to apply my gaps to.
The code is then just a simple tail recursive method where we keep track of the state of the hands that we are building and make sure to add all possible new gaps on.

```scala
  type RankSet = SortedSet[Rank]

  def genStraightsWithAceLow(maxGap: Int) = {
    @tailrec
    def go(state: List[RankSet], size: Int): List[RankSet] =
      if size == 5
      then state
      else
        go(
          for
            hand <- state
            step <- (1 to maxGap + 1).toList
          yield hand + Rank.fromOrdinal(hand.max.ordinal + step),
          size + 1
        )

    go(List(SortedSet(Rank.Ace)), 1)
  }
```

The above will give us all the rank sets we desire that start with an Ace.
So for example `genStraightsWithAceLow(0) == List(TreeSet(Ace, Two, Three, Four, Five))`, and `genStraightsWithAceLow(1)` gives us the 16 expected rank sets if we allow gaps of 1 (remember it's just the leaves of a depth five binary tree.)
For gaps of 2 we get the leaf nodes of a ternary tree of depth five which is $3^4$ better known as $81$.
The one with maximal gaps is of course `TreeSet(Ace, Four, Seven, Ten, King)` where we always use gaps of 2.
This will explode for gap sizes of 3 because we'll go beyond `King`!
So I just need to make a little modification to make sure we don't go beyond `King`

```scala
  def genStraightsWithAceLow(maxGap: Int) = {
    @tailrec
    def go(state: List[RankSet], size: Int): List[RankSet] =
      if size == 5
      then state
      else
        go(
          for
            hand       <- state
            step       <- (1 to maxGap + 1).toList
            newRank     = hand.max.ordinal + step
            newRankSet <- Option.when(newRank <= Rank.King.ordinal)(hand + Rank.fromOrdinal(newRank))
          yield newRankSet,
          size + 1
        )

    go(List(SortedSet(Rank.Ace)), 1)
  }
```

So with a possible gap size of 3 we don't quite have a full quaternary tree since some paths would lead us beyond King which isn't allowed given we're considering only Ace low rank sets to sort of seed the generation of the other rank sets.

Anyway I promised some visualisations didn't I!
Not too long ago I gave a talk that involved trees so I can just recycle some of that old [Doodle](https://www.creativescala.org/doodle/) code to make visualisations here[^claude-disclaimer].

[^claude-disclaimer]: I actually just pointed claude at my old code and told it to modify it a little to make the tree visualisations, which is perhaps a little hypocritical given my previous rant about AI. But in my defence I'd already done the fun part for my talk so a while back.

The first visualisation is rather boring , it represents the case where we are not allowed any gaps (i.e. normal straights.)
So it really is just a chain.

<figure>
  <img src="/images/gappy-trees/gap-1-chain.png"/>
</figure>

The next is the binary tree/trie I was talking about.
Under each leaf node I've added the full path so you can read off all 16 gappy straights that start with an Ace nicely.

<figure class="wide">
  <img src="/images/gappy-trees/gap-2-shortcut.png"/>
</figure>

Just for fun here's the ternary tree if we're allowed even more gaps!
So if we're allowed gaps of 0, 1, or 2!
I've not even tried to render the paths under the leaf nodes for this one lol.

<figure class="wide">
  <img src="/images/gappy-trees/gap-3-complete.png"/>
</figure>

I did also actually create an image for the truncated quaternary tree but it's kind of hard to see any of the details so I shan't include it here.

Ok so what we have now is a way of generating all gappy rank sets of 5 that start with an Ace, the next step is to use these kind of like templates to generate startights that start with 2,3,...,10.
This is precisely what

```scala
  private lazy val allFiveRankStraights: Set[RankSet] =
    Iterator.iterate(Rank.Ace)(_.nextRank).take(10).map(mkFiveCardStraight).toSet
```

was doing in the normal straight counter.
We can actually visualise it with our chains like so!

<figure class="wide">
  <img src="/images/gappy-trees/normal-straights.png"/>
</figure>

Each chain is just the previous chain but with all the values increased by 1.
Again it's not the most interesting, it looks a bit like a demented abacus, but it shows what we need to do with the binary tree.
We simply generate more trees by increasing the value of each node by 1 each time.
It's kind of hard to put all of this in one image so I'll just show what the second tree (starting from 2) will look like!

<figure class="wide">
  <img src="/images/gappy-trees/gap-2-from-2.png"/>
</figure>

And you can imagine what the trees starting with 3 and 4 etc would look like.
You can also imagine the problem we start to hit when we consider large enough starting numbers, some paths will start trying to go beyond Ace (remember other than the first tree we can consider ace to be high) so we'll have to prune them!
I think a nice example of these pruned paths will become apparant if we consider starting with 9.

<figure class="wide">
  <img src="/images/gappy-trees/gap-2-from-9.png"/>
</figure>

As you can see several paths have to be terminated early, we only have 5 legit paths rather than the usual 16.
So when it comes to writing the code for creating the straights that begin with something other than an Ace I can't just add one to everything in each rank set, I obvioulsy need to get rid of anything that would go beyond Ace.
To do this it's kind of easier for me to work with ordinals directly rather than the `Rank` data type, here's the code

```scala
  private def allFiveRankStraights(maxGap: Int): Set[RankSet] = {
    val aceLowAsOrdinals = genStraightsWithAceLow(maxGap).map(_.map(_.ordinal))

    Iterator
      .iterate(aceLowAsOrdinals)(_.map(_.map(_ + 1)).filter(rs => !rs.contains(aceHighOrdinal + 1)))
      .takeWhile(_.nonEmpty)
      .flatten
      .map(_.map(x => if x == aceHighOrdinal then Rank.Ace else Rank.fromOrdinal(x)))
      .toSet
  }
```

All I'm doing is using the function we defined before to get the templates, that's what the `aceLowAsOrdinals` is.
I then iterate and add 1 to everything in each iteration, making sure to kick out anything that goes beyond the `aceHighOrdinal`.
I stop iterating once we produce empty ordinal sets because that means we've gone beyond Ace high in all places.
And finally I just flatten everything together and turn everything back into `Rank`s which required special logic for high aces.
This means I can then finally use this in the main function which you'll remember basically just makes straight-containing rank sets with 6 ranks, then 7, etc...

```scala
  def countStraightRankSets(degenClass: DegeneracyClass, maxGap: Int): Int =
    rankSetsWithStraight(degenClass.distinctRanks, maxGap).size

  def countStraightRankSets(r: Int, maxGap: Int): Int =
    rankSetsWithStraight(r, maxGap).size

  private def rankSetsWithStraight(n: Int, maxGap: Int): Set[RankSet] =
    if n < 5 then Set.empty
    else if n == 5 then allFiveRankStraights(maxGap)
    else
      for
        rankSet   <- rankSetsWithStraight(n - 1, maxGap)
        otherRank <- otherRanks(rankSet)
      yield rankSet + otherRank
```

Oh and for completeness here's the whole file, it's not tooooo bad but I do kind of wonder if there's a simpler way. Like I was guided by the implementation I had for normal straights I suppose! I can imagine some approach where we start with the normal straights and then consider small mutations to find all the gappy ones, a little bit like how you can get to all the corners of a cube by considering mutations of the vector (0,0,0).

```scala
object RankSetsWithGappyStraightCounter:

  type RankSet = SortedSet[Rank]

  val aceHighOrdinal = Rank.King.ordinal + 1

  def countStraightRankSets(degenClass: DegeneracyClass, maxGap: Int): Int =
    rankSetsWithStraight(degenClass.distinctRanks, maxGap).size

  def countStraightRankSets(r: Int, maxGap: Int): Int =
    rankSetsWithStraight(r, maxGap).size

  private def rankSetsWithStraight(n: Int, maxGap: Int): Set[RankSet] =
    if n < 5 then Set.empty
    else if n == 5 then allFiveRankStraights(maxGap)
    else
      for
        rankSet   <- rankSetsWithStraight(n - 1, maxGap)
        otherRank <- otherRanks(rankSet)
      yield rankSet + otherRank

  private def allFiveRankStraights(maxGap: Int): Set[RankSet] = {
    val aceLowAsOrdinals = genStraightsWithAceLow(maxGap).map(_.map(_.ordinal))

    Iterator
      .iterate(aceLowAsOrdinals)(_.map(_.map(_ + 1)).filter(rs => !rs.contains(aceHighOrdinal + 1)))
      .takeWhile(_.nonEmpty)
      .flatten
      .map(_.map(x => if x == aceHighOrdinal then Rank.Ace else Rank.fromOrdinal(x)))
      .toSet
  }

  private def genStraightsWithAceLow(maxGap: Int) = {
    @tailrec
    def go(state: List[RankSet], size: Int): List[RankSet] =
      if size == 5
      then state
      else
        go(
          for
            hand       <- state
            step       <- (1 to maxGap + 1).toList
            newRank     = hand.max.ordinal + step
            newRankSet <- Option.when(newRank <= Rank.King.ordinal)(hand + Rank.fromOrdinal(newRank))
          yield newRankSet,
          size + 1
        )

    go(List(SortedSet(Rank.Ace)), 1)
  }

  private def otherRanks(ranks: RankSet): Set[Rank] =
    allRanks diff ranks

  private val allRanks: Set[Rank] =
    Rank.values.toList.toSet

end RankSetsWithGappyStraightCounter
```

Right so what have we actually done here?
We've basically just generalised $S(r)$ to $S_g(r)$ where the subscript $g$ denotes the max gap size allowed.
So the previous $S(r)$ is equivalent to $S_0(r)$ and the shortcut Joker is equivalent to $S_1(r)$.

I think we're finally ready to wire everything together now!
I'll start with just computing the results for the shortcut joker and then generalise for even bigger gaps, basically to match what I did for the brute force approach.
We just need something analagous to `StraightCounter`, let's call it `GappyStraightCounter`.
Here it is.

```scala
object GappyStraightCounter:

  def computeStraightCount(handSize: Int, maxGap: Int): Long =
    getDegeneracyClasses(handSize)
      .foldMap(c => countStraightRankSets(c, maxGap) * placementFactor(c) * suitFactor(c))

  def countStraightRankSets(degenClass: DegeneracyClass, maxGap: Int): Long =
    RankSetsWithGappyStraightCounter.countStraightRankSets(degenClass, maxGap)

  def placementFactor(degenClass: DegeneracyClass): Long =
    multinomial(degenClass.frequencies)

  def suitFactor(degenClass: DegeneracyClass): Long =
    degenClass.toList
      .foldMap { case (degeneracy, frequency) =>
        binomial(4, degeneracy) `pow` frequency
      }(using Monoid.instance(1L, _ * _))

  def factorial(n: Int): BigInt =
    (1 to n).toList.foldMap(BigInt.apply)(using Monoid.instance(BigInt(1), _ * _))

  def binomial(n: Int, k: Int): Long =
    (factorial(n) / factorial(n - k) / factorial(k)).toLong

  def multinomial(ks: List[Int]): Long =
    (factorial(ks.sum) / ks.foldMap(factorial)(using Monoid.instance(BigInt(1), _ * _))).toLong

  extension (l: Long)
    def pow(exponent: Int): Long =
      BigInt(l).pow(exponent).toLong

end GappyStraightCounter
```

So I've checked that it reproduces the correct answer for `maxGap = 0`, yay!
And for `maxGap = 1` we get this.

| Hand size | Total hands             | Hands containing a gappy straight | Approx odds          | Probability of a gappy straight |
| --------- | ----------------------- | --------------------------------- | -------------------- | ------------------------------- |
| $5$       | $2{,}598{,}960$         | $131{,}072$                       | $1 \text{ in } 19.8$ | $5.04\%$                        |
| $6$       | $20{,}358{,}520$        | $3{,}342{,}336$                   | $1 \text{ in } 6.1$  | $16.42\%$                       |
| $7$       | $133{,}784{,}560$       | $42{,}795{,}008$                  | $1 \text{ in } 3.1$  | $31.99\%$                       |
| $8$       | $752{,}538{,}150$       | $366{,}608{,}384$                 | $1 \text{ in } 2.1$  | $48.72\%$                       |
| $9$       | $3{,}679{,}075{,}400$   | $2{,}352{,}553{,}984$             | $1 \text{ in } 1.6$  | $63.94\%$                       |
| $10$      | $15{,}820{,}024{,}220$  | $12{,}050{,}001{,}920$            | $1 \text{ in } 1.3$  | $76.17\%$                       |
| $11$      | $60{,}403{,}728{,}840$  | $51{,}384{,}434{,}688$            | $1 \text{ in } 1.2$  | $85.07\%$                       |
| $12$      | $206{,}379{,}406{,}870$ | $187{,}936{,}745{,}472$           | $1 \text{ in } 1.1$  | $91.06\%$                       |
| $13$      | $635{,}013{,}559{,}600$ | $602{,}370{,}525{,}184$           | $1 \text{ in } 1.1$  | $94.86\%$                       |

Bam! That exactly reproduces the table found when I used the brute force approach. How thrilling.
Ok so I guess the final thing is to produce a table with many different max gap sizes, and then I can go to Dalston Superstore to celebrate.

| Hand size | Gap size $0$ | Gap size $1$ | Gap size $2$ | Gap size $3$ | Gap size $4$ |
| --------- | ------------ | ------------ | ------------ | ------------ | ------------ |
| $5$       | $0.39\%$     | $5.04\%$     | $18.56\%$    | $33.69\%$    | $43.26\%$    |
| $6$       | $1.81\%$     | $16.42\%$    | $41.95\%$    | $62.84\%$    | $74.68\%$    |
| $7$       | $4.82\%$     | $31.99\%$    | $62.07\%$    | $80.36\%$    | $89.56\%$    |
| $8$       | $9.82\%$     | $48.72\%$    | $76.83\%$    | $89.87\%$    | $95.71\%$    |
| $9$       | $16.84\%$    | $63.94\%$    | $86.66\%$    | $94.89\%$    | $98.2\%$     |
| $10$      | $25.61\%$    | $76.17\%$    | $92.73\%$    | $97.5\%$     | $99.23\%$    |
| $11$      | $35.53\%$    | $85.07\%$    | $96.23\%$    | $98.82\%$    | $99.68\%$    |
| $12$      | $45.87\%$    | $91.06\%$    | $98.13\%$    | $99.46\%$    | $99.87\%$    |
| $13$      | $55.93\%$    | $94.86\%$    | $99.11\%$    | $99.76\%$    | $99.95\%$    |

Even with huge hands and huge gaps allowed we still can't guarantee a straight!
I suppose an example of not getting a straight with a hand size of 13 would be 4 Aces, 4 2s, 4 3s, and 1 four; I think you'd basically need a lot of degeneracy to avoid making a straight!

### Conclusions for Gappy Straights

Well we finally made it!
I think the tricky and important part of working this out was really in the "Normal Straights" section.
All I did for gappy straights was generalise the well tested approach for normal straights.
I think if I had more time I'd have tested the brute force approach out properly but I am fairly certain that it's correct just because I back myself.
To be honest I don't really have much more to say about gappy straights than I do for normal straights, I used the same techniques I've been using all along for the generalisation: making a plan in my head about what to do before blindly diving in, using recursion, making sure to sense check the output of the smaller functions, etc...
I think this blog post overall really is about the journey and the most intereting part of the journey is not this section but the normal straights section!

## Appendix

### Generalised No Duplicates Case

Whilst my argument above is correct I can't help but wonder if there's a simpler way to derive the $8, 47, 162$. I think the main thing that complicates the argument is the fact that straights do not wrap around which of course manifests in the above argument as wether or not an Ace appears.
Given that I've used the above argument twice now seems like a good time to generalise this.

So let's consider a hand with $n$ cards (and assume that $n <= 13$.)
We will start with the case of having a straight of $n$ consecutive ranks and then work backwards.
If we have $n$ consecutive ranks there are $15 - n$ possible straights, I think that's fairly intuitive.

Now what if we have $n - 1$ consecutive ranks?
Well we have of course got $15 - (n - 1)$ possible straights there.
And then we have to do the case work and split this into whether or not a straight contains an Ace.
There are always $2$ that will and $15 - (n - 1) - 2$ that won't.
For those that have Aces the final (disjoint) rank can be picked from $13 - (n - 1) - 1$ ranks.
The $(n - 1)$ part comes from the fact that we can't pick the rank from what's already in the straight, and the last $- 1$ comes from the fact that we can't pick a rank that's next to the straight either.
Now for straights without Aces the argument is similar.
The final (disjoint) rank can be picked from $13 - (n - 1) - 2$ ranks.
This time we have a $ - 2$ because we're not allowed to pick a rank that touches the straight on either side.
So putting this together we have the slightly cumbersome formula

$$ 2 \times (13 - (n - 1) - 1) + (15 - (n - 1) - 2) \times (13 - (n - 1) - 2) $$

Now obviously I could simplify that if I wanted to but I'm about to consider the case of $n - k$ consecutive ranks where of course we assume that $n - k >= 5$. But first I guess I should double check that formula gives the correct result for the examples we have seen before.

```scala
def check(n: Int) =
  2 * (13 - (n - 1) - 1) + (15 - (n - 1) - 2) * (13 - (n - 1) - 2)
```

This does indeed give me $62$ and $47$ for $n = 6$ and $n = 7$ respectively.

Right! Now we can consider the $n - k$ case.
We have $15 - (n - k)$ possible straights.
$2$ will contain and Ace, and $15 - (n - k) - 2$ won't.
For those that do contain an Ace the disjoint ranks can be picked from $13 - (n - k) - 1$ possible ranks.
And for those that do not contain an Ace the disjoint ranks can be picked from $13 - (n - k) - 2$ possible ranks.
Great! I've basically just replaced $-1$ with $-k$.
There is one more thing we need to do which is to include suitable binomial coefficients since we're now picking more than one disjoint rank and have to count different ways of doing this from the available ranks!
There will be $k$ disjoint ranks.
So the (again slightly cumbersome formula will be as follows)

$$ 2 \times \binom{13 - (n - k) - 1}{k} + (15 - (n - k) - 2) \times \binom{13 - (n - k) - 2}{k} $$

I believe that this formula is correct but it's worth noting that the argument I used to derive it has a flaw in it. It only works for hands that can contain at most one straight. If a hand is big enough to contain two or more straights (i.e. has 9 or more cards; with 9 cards you can have A,2,3,4,5 AND 10,J,Q,K,A) then it breaks down because we'll be double counting things again.

## Random links

- Project Euler [problem 54](https://projecteuler.net/problem=54) is all about poker if you find this post deeply inspirational and would like to solve a different poker related problem
- Project Euler [problem 76](https://projecteuler.net/problem=76) is basically just asking you to count integer partitions, which is exactly what we were generating for our degeneracy classes (just without our cap of 4 on the parts)
- Project Euler [problem 78](https://projecteuler.net/problem=78) is about the partition function too but in a classic Project euler move it has been made hard enough that you'd struggle to brute force it.
- Project Euler [problem 31](https://projecteuler.net/problem=31) ("coin sums") is the restricted-parts cousin: partitions where the parts have to come from a fixed set (coin denominations) rather than just being anything from 1 to 4
