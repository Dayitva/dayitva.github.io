---
title: Intro to Mathematical Thinking
feed: show
date: 01-10-2023
permalink: /mathematical-thinking
format: card
---
---
> Instructor: **Keith Devlin**  
> Platform: **Coursera**  
> Status: **Completed**

---

The course is about thinking, not learning new mathematical techniques.

Normal language (eg. English) is riddled with inconsistencies. However, mathematical language needs to be precise. Hence, almost all key statements of mathematics are a positive or negative form version of one of these four linguistic forms:

1. Object *a* has property **P**
*3 is a prime number*
2. Every object of type **T** has property **P**
*Every polynomial equation has a complex root*
3. There is an object of type **T** having property **P**
*There is a prime number between 20 and 25*
4. If statement **A**, then statement **B**
*If p is a prime number of the form $4n+1$, then p is a sum of two squares*

The key language terms involved in making these statements are:

1. and ($\land$)
2. or ($\lor$)
3. not ($\lnot$)
4. implies ( $\Rightarrow$)
5. for all ($\forall$)
6. there exists ($\exists$)

## Truth Tables and Explanations

---

### CONJUNCTION (AND)

| $\phi$ | $\psi$ | $\phi \land \psi$ |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

### DISJUNCTION (OR)

| $\phi$ | $\psi$ | $\phi \lor \psi$ |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |

### NEGATION (NOT)

| $\phi$ | $\lnot \phi$ |
|---|---|
| 0 | 1 |
| 1 | 0 |

$\lnot (\phi \land \psi)$ is equivalent to $(\lnot \phi) \lor (\lnot \psi)$

$\lnot (\phi \lor \psi)$ is equivalent to $(\lnot \phi) \land (\lnot \psi)$

### IMPLICATION (IMPLIES)

| $\phi$ | $\psi$ | $\phi \Rightarrow \psi$ |
|---|---|---|
| 0 | 0 | 1 |
| 0 | 1 | 1 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

The following all mean $\phi$ implies $\psi$:

1. If $\phi$, then $\psi$
2. $\phi$ is sufficient for $\psi$
3. $\phi$ only if $\psi$ (NOT THE SAME AS If $\psi$, then $\phi$)
4. $\psi$ if $\phi$
5. $\psi$ whenever $\phi$
6. $\psi$ is necessary for $\phi$.

$\phi \Rightarrow \psi$ is equivalent to ($\lnot \phi \lor \psi$) is equivalent to $(\phi \land \psi) \lor (\lnot \phi)$

$\lnot (\phi \Rightarrow \psi)$ is equivalent to ($\phi \land \lnot \psi$)

$\phi \Rightarrow \psi$ is always $\lnot \psi \Rightarrow \lnot \phi$ (***Contrapositive*** is always true)  
$\phi \Rightarrow \psi$ is not always $\psi \Rightarrow \phi$ (***Converse*** can be false)

This gives us the following:

1. **Modus Ponens:** $[\phi \land (\phi \Rightarrow \psi)] \Rightarrow \psi$
$\phi \Rightarrow \psi$, $\phi$ is true, hence $\psi$ is true.
1. **Modus Tolens:** $[\lnot \psi \land (\phi \Rightarrow \psi)] \Rightarrow \lnot \phi$
$\phi \Rightarrow \psi$, $\lnot \psi$ is true, hence $\lnot \phi$ is true.

Proof by Contradiction can be explained by Implication.  
For a proof p, $\phi \Rightarrow \psi$, $\psi$ is known to be **false** and the proof (implication) is **true**.  
Hence, $\phi$ needs to be **false** (from the truth table), making our initial assumption to be wrong.

### EQUIVALENCE (XNOR)

| $\phi$ | $\psi$ | $\phi \Leftrightarrow \psi$ |
|---|---|---|
| 0 | 0 | 1 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

"$\phi$ is equivalent to $\psi$" is itself equivalent to

1. $\phi$ is necessary and sufficient $\psi$
2. $\phi$ if and only if $\psi$ (abbreviated "iff")

Hence, $\phi \Leftrightarrow \psi$ is equivalent to $(\phi \Rightarrow \psi) \land (\psi \Rightarrow \phi)$

$\phi \Leftrightarrow \psi$ is also equivalent to $\lnot \phi \Leftrightarrow \lnot \psi$

### QUANTIFIERS

The order of quantifiers is very important. These two are not the same:

1. ($\forall n \in \mathbb{N}$)($\exists m \in \mathbb{N}$)$[m > n]$
2. ($\exists m \in \mathbb{N}$)($\forall n \in \mathbb{N}$)$[m > n]$

The former means that for all n, there exists a number m such that m is greater than n. This is a **true** statement as there is no greatest natural number and there is always something bigger.

The latter statement, however, is **false**. It implies that there exists a number m such that for all n, m is greater than n which is not true.

$\lnot [\forall x A(x)] = \exists x [\lnot A(x)]$

Similarly,  
$\lnot [\exists x A(x)] = \forall x [\lnot A(x)]$

Let $\mathbb{N}$ be the domain of quantification  
Let $E(x): x$ is even and $O(x): x$ is odd

Then,
$\forall x[E(x) \lor O(x)] \neq \forall x E(x) \lor \forall x O(x)$

The former means that for every natural number, it's either even or odd which is **true**.
The latter means that every natural number is either even or it's odd which is **false**.

Similarly,
$\exists x [E(x) \land O(x)] \neq \exists x E(x) \land \exists x O(x)$

With a similar reasoning, the former is **false** but the latter is **true**.

However,  
$\forall x[E(x) \land O(x)] = \forall x E(x) \land \forall x O(x)$

and  
$\exists x [E(x) \lor O(x)] = \exists x E(x) \lor \exists x O(x)$

This happens because,  
$\forall$ is like $\land$ (all parts need to be true) and $\exists$ is like $\lor$ (at least one needs to be true)

## Proofs

### Proof by Contradiction

---

To prove $\forall x A(x)$, we assume that $\lnot \forall x A(x)$ is true. This means that $\exists x \lnot A(x)$ is true. We then show that this leads to a contradiction.

***Theorem***: $\sqrt{2}$ is irrational.

***Proof***: We use the method of proof by contradiction. We assume that $\sqrt{2}$ is rational. Then, there are natural numbers $p$ and $q$ such that $\sqrt{2} = \frac{p}{q}$ and $p$ and $q$ have no common factors.

Squaring both sides, we get $2 = \frac{p^2}{q^2}$ or $p^2 = 2q^2$. This means that $p^2$ is even. Hence, $p$ is even. So, $p = 2k$ for some natural number $k$. Substituting this in the equation, we get $2q^2 = 4k^2$ or $q^2 = 2k^2$. This means that $q^2$ is even. Hence, $q$ is even. This means that $p$ and $q$ have a common factor, which is a contradiction. Hence, $\sqrt{2}$ is irrational.

### Method of Proof by Cases

---

The method of proof by cases consists of dividing the proof into cases, and proving each case separately. The cases must be mutually exclusive and their union must be the entire problem to be solved.

To prove $\exists x A(x)$, we need to find an object $a$ for which $A(a)$ is true. For example, to show that there is an irrational number, prove that $\sqrt{2}$ is irrational. This does not always work. So, sometimes, we use indirect proofs.

***Theorem***: There are irrational numbers $r$ and $s$ such that $r^s$ is rational.

***Proof***: We consider 2 cases.

Case 1: If $\sqrt{2}^{\sqrt{2}}$ is rational, we take $r = s = \sqrt{2}$  
Case 2: If $\sqrt{2}^{\sqrt{2}}$ is irrational, we take $r = \sqrt{2}^{\sqrt{2}}$ and $s = \sqrt{2}$

Then, $r^s = \sqrt{2}^{\sqrt{2} \times \sqrt{2}} = \sqrt{2}^2 = 2$, which is rational.

Hence, the theorem is proved.

### Proof by Mathematical Induction

---

To prove $\forall n A(n)$, establish the following two statements:

1. $A(1)$ is true
2. $\forall n [A(n) \Rightarrow A(n+1)]$

***Theorem***: For all $n \in \mathbb{N}$, $1 + 2 + 3 + ... + n = \frac{n(n+1)}{2}$

***Proof***: We use the method of proof by induction.

**Basis Step**: For $n = 1$, $1 = \frac{1(1+1)}{2}$, which is true.

**Induction Step**: Assume that for some $k \in \mathbb{N}$, $1 + 2 + 3 + ... + k = \frac{k(k+1)}{2}$

We need to show that $1 + 2 + 3 + ... + k + (k+1) = \frac{(k+1)(k+2)}{2}$

We have, $1 + 2 + 3 + ... + k + (k+1) = \frac{k(k+1)}{2} + (k+1) = \frac{k(k+1) + 2(k+1)}{2} = \frac{(k+1)(k+2)}{2}$

Hence, by mathematical induction, the theorem is proved.

Here's another example,

***Theorem***: Every natural number greater than 1 is either prime or a product of primes.

***Proof***: We use the method of proof by induction. The induction statement $A(n)$ would be

$$A(n): \forall k [2 \leq k \leq n] \Rightarrow k \text{ is prime or product of primes}$$

**Basis Step**: For $n = 2$, $2$ is prime.

**Induction Step**: Assume that for some $n \in \mathbb{N}$, every natural number greater than 1 and less than or equal to $n$ is either prime or a product of primes.

We need to show that every natural number greater than 1 and less than or equal to $n+1$ is either prime or a product of primes.

If $k \leq n$, then by $A(n)$, $k$ is either prime or a product of primes.

If $k = n+1$ and if $n+1$ is prime, then $k$ is prime.

If $k = n+1$ and if $n+1$ is not prime, then there are natural numbers $p$ and $q$ such that $1 < p,q < n+1$ and $n+1 = pq$. Since, $2 \leq p,q \leq n$, by $A(n), p, q$ are either primes or a product of primes. Hence, $n+1$ is a product of primes and the theorem is proved.

### Euclid's Proof for Infinite Primes

---

Euclid offered a proof published in his work *Elements* which is paraphrased here.

Consider any finite list of prime numbers $p_1, p_2, ..., p_n$. It will be shown that at least one additional prime number not in this list exists. Let $P$ be the product of all the prime numbers in the list: $P = p_1 p_2 ... p_n$. Let $q = P + 1$. Then $q$ is either prime or not:

- If *q* is prime, then there is at least one more prime that is not in the list, namely, *q* itself.
- If *q* is not prime, then some prime factor *p* divides *q*. If this factor *p* were in our list, then it would divide *P* (since *P* is the product of every number in the list); but *p* also divides *P* + 1 = *q*, as just stated. If *p* divides *P* and also *q,* then *p* must also divide the difference of the two numbers, which is (*P* + 1) − *P* or just 1. Since no prime number divides 1, *p* cannot be in the list. This means that at least one more prime number exists beyond those in the list.

This proves that for every finite list of prime numbers there is a prime number not in the list.

### Fundamental Theory of Arithmetic

---

The **fundamental theorem of arithmetic**, also called the **unique factorization theorem** or the **unique-prime-factorization theorem**, states that every integer greater than 1 either is a prime number itself or can be represented as the product of prime numbers and that, moreover, this representation is unique, up to (except for) the order of the factors. For example,

$$1200 = 2^4 \times 3 \times 5^2$$

The theorem says two things:

1. That 1200 can be represented as a product of primes.
2. That this representation is unique.

The theorem is one of the main reasons why 1 is not considered a prime number: if 1 were prime, then factorization into primes would not be unique.

**Proof of the Theorem:**

We have already proved the existence (that every natural number greater than one is at least prime or a product of primes) before. Hence, we only need to prove uniqueness.

To prove uniqueness, we assume that $n$ is the smallest number such that it can be written as a product of primes in two different ways. Let $n = p_1 p_2 ... p_r = q_1 q_2 ... q_s$ where $p_1, p_2, ..., p_r, q_1, q_2, ..., q_s$ are primes. We need to show that $r = s$ and that $p_1, p_2, ..., p_r$ is a permutation of $q_1, q_2, ..., q_s$.

We have $p_1 | n$ and $p_1 | q_1 q_2 ... q_s$. Since $p_1$ is prime, it must divide at least one of $q_1, q_2, ..., q_s$. Without loss of generality, let $p_1 | q_1$. Since $q_1$ is prime, $p_1 = q_1$. Otherwise, $p_1 = q_i$ for some $i$ from $2..s$. We can cancel $p_1$ and the corresponding $q_i$ from both sides of the equation and repeat the same argument for $p_2, p_3, ..., p_r$ and $q_2, q_3, ..., q_s$. But then, we have found a smaller representation of a number as a product of primes, which is a contradiction. Hence, $r = s$ and $p_1, p_2, ..., p_r$ is a permutation of $q_1, q_2, ..., q_s$.

The theorem is proved.

## Other interesting stuff

### Conjunction Fallacy

---
The **conjunction fallacy** (also known as the **Linda problem**) is an inference from an array of particulars, in violation of the laws of probability, that a conjoint set of two or more conclusions is likelier than any single member of that same set. It is a type of formal fallacy.

The most often-cited example of this fallacy originated with Amos Tversky and Daniel Kahneman.

> *Linda is 31 years old, single, outspoken, and very bright. She majored in philosophy. As a student, she was deeply concerned with issues of discrimination and social justice, and also participated in anti-nuclear demonstrations.*  
>
> Which is more probable?
>
> 1. Linda is a bank teller.
> 2. Linda is a bank teller and is active in the feminist movement.

The majority of people choose option 2. However, the probability of two events occurring together (that is, in conjunction) is always less than or equal to the probability of either one occurring alone. Formally, for two events *A* and *B* this inequality could be written as

$$Pr(A \land B) \leq Pr(B)$$

### Wason Selection Task

---

The **Wason selection task** (also called the **four-card problem**) is a logic puzzle devised by Peter Cathcart Wason in 1966. It is one of the most famous tasks in the study of deductive reasoning.

The Wason selection task is as follows:

> You are shown a set of four cards placed on a table, each of which has a number on one side and a colored patch on the other side. The visible faces of the cards show 3, 8, red and brown. Which card(s) must you turn over in order to test the truth of the proposition that if a card shows an even number on one face, then its opposite face is red?
>
> Turn over only those cards necessary to test the truth of this rule.
>
> Which cards did you turn over?

If you turned over the cards showing 8 and brown, then you are correct.

If you turned over the cards showing 8 and red, then you are not alone. Many people make this response, but it is incorrect. Why?

The card showing an even number (8) is necessary to turn over because, if there is an odd number on the other side, then the rule has been violated. The brown card is also necessary to turn over because, if there is a non-red color on the other side, then the rule has been violated. The card showing an odd number (3), however, is not necessary to turn over because, no matter what color is on its back, it does not violate the rule.

The rule is a conditional statement: If P then Q. The only way that such a statement can be false is if P is true and Q is false. Turning over the card showing an odd number (3) would not violate the rule, no matter what is on the other side of it. Turning over the card showing a red color (8) would violate the rule if there is an even number on the other side, but it would not violate the rule if there is an odd number on the other side. Thus, turning over the card showing a red color (8) is not necessary to test the rule.

Compare this now with the following problem:

> You are in charge of a party where there are young people. Some are drinking alcohol, others soft drinks. Some are old enough to drink alcohol legally, others are under age. You are responsible for ensuring that the drinking laws are not broken, so you have asked each person to put his or her photo ID on the table. At one table are four young people. One person has a beer, another has a Coke, but their IDs happen to be face down so you cannot see their ages. You can, however, see the IDs of the other two people. One is under the drinking age, the other is above it. Unfortunately, you are not sure if they are drinking Seven-up or vodka and tonic. Which IDs and/or drinks do you need to check to make sure that no one is breaking the law?

This problem seems much easier to solve even though it has the same structure as the one described above. The answer is that you need to check the ID of the person drinking beer and the drink of the person who is under the drinking age. You do not need to check the ID or the drink of the other two people, because no matter what their age or drink is, they are not breaking the law.

### Hilbert's Infinite Hotel

---

Hilbert's paradox of the **Grand Hotel** (or **Hilbert's paradox of the Grand Infinite**) is a thought experiment which illustrates a counterintuitive property of infinite sets. It is demonstrated that a fully occupied hotel with infinitely many rooms may still accommodate additional guests, even infinitely many of them, and this process may be repeated infinitely often.

One can imagine the following procedure for accommodating a single new guest:

1. The hotel manager asks each guest to move to the room whose number is one more than their current room number. Hence, guest in room $n$ moves to room $n+1$. This is possible as there are infinitely many rooms.
2. Room 1 is now empty which the new guest can take.

Similarly, if infinitely many new guests arrive, the manager can ask the guests to move to the room whose number is twice their current room number. Hence, guest in room $n$ moves to room $2n$ (all the even numbered rooms). This is also possible as there are infinitely many rooms. Now, as all the odd numbered rooms are empty, the new guests can take them.
