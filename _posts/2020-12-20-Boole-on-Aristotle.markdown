---
layout: post
title: "Boole on Aristotle"
usemathjax: true
date: 2020-12-20
categories: math logic
---

I was recently reading George Boole's "Investigation of the Laws of
Thought" and I was having trouble replicating one of his
derivations. Since I had trouble finding any explanation online of how
he got his results, I thought it would be worth putting my attempt
online.

A little context first. Boole builds up this elaborate set of
mechanisms and rules of thumb for solving systems of equations in
which the variables $$x$$ satisfy the equation $$x^2=x$$, or
equivalently, $$x*(1-x) = 0$$. This methodology allows you figure out
relationships among the variables that are not explictly stated, but
are implied by the system together with the above equation.

More than 2000 years before Boole created this system, Aristotle
developed his logic around syllogisms. The cannonical example of a
syllogism is the following. "All men are mortal. Socrates is a
man. Therefore Socrates is mortal." Syllogisms always have two
premises that share a common term (in this case "man/men"). The rules
of syllogism determine the correct relationship between the other two
terms in the premises (in this case "Socrates" and "mortal").

Aristotle's syllogisms can be expressed in Boole's calculus as a
system of two equations with a relatively limited form. Since Boole
shows how to solve arbitrary systems of equations, it's very natural
to apply his methods to Aristotle's syllogisms. He does this in the
maximal generality possible. Throughout most the book up to this
point, Boole includes essentially all the details of his
derivations. However, when deriving conclusions from the premises of
Aristotelian syllogisms, he skips right to the end.

I tried to follow along by reproducing the results, but I couldn't
make it work. I am recording my best attempt below in the hopes that
somebody might stumble across it and set me straight. Since I also
could not find an explicit derivation (in the original form of Boole's
calculus) online, I thought somebody in the future might go looking
for it and be happy to see an attempt (flawed though it may be).

I don't provide any of the background on Boole's calculus. I encourage
you to read it for yourself if you are interested. For something that
has become so pervasive in the modern world of computers, Boole's
first introduction of this method is charmingly exotic. It can found
in its entirety online [here](https://www.gutenberg.org/files/15114/15114-pdf.pdf){:target="_blank"}.

## The Derivation

The system we are presented with is the following:

$$\begin{align*}
  vx &= v'y\\
  wz &= w'y
\end{align*}$$

The idea is to determine the relationship that holds between $$x$$ and
$$z$$. Here $$v,v',w,w'$$ are class symbols that are either 1 or are
indefinite class symbols. We assume $$v$$ and $$v'$$ are not both 1 and
$$w$$ and $$w'$$ are not both 1. (It is unclear if this fact is important
in the derivation I am trying to reconstruct.)

The above system gives us the single equation
$$\begin{equation}
  \label{elim}
 vx - v'y -w'y + wz = 0 
\end{equation}$$
from which we must eliminate $$y$$.

We will take advantage of some techniques of abbreviation introduced
by Boole in his Chapter IX.

From $$vx - v'y = 0$$, we can square it to obtain

$$ vx(1-v'y) + (1-vx)v'y = 0.$$

Similarly $$wz -w'y = 0$$ give us

$$ wz(1-w'y) + (1-wz)w'y = 0.$$

So by adding we have

$$\begin{equation}\label{eq:p1}
  vx(1-v'y) + (1-vx)v'y + wz(1-w'y) + (1-wz)w'y = 0.
\end{equation}$$

in order to use other abbreviations we want this to be a sum of
constituents $$V$$ that satisfy $$V(1-V)=0$$. We can therefore rely on

$$ 1-v'y = (1-v')y + v'(1-y) + (1-v')(1-y) $$

and similar equations for $$1-vx$$, $$1-w'y$$, and $$1-wz$$ to get

$$\begin{align}
  \label{eq:p2}
  vx[(1-v')y + v'(1-y) + (1-v')(1-y)] &+ \\
  \nonumber
  v'y[(1-v)x + v(1-x) + (1-v)(1-x)] &+ \\
  \nonumber
  wz[(1-w')y + w'(1-y) + (1-w')(1-y)] &+ \\
  \nonumber
  w'y[(1-w)z + w(1-z) + (1-w)(1-z)] & = 0
\end{align}$$

We want to express this as $$Ez + E'(1-z) = 0$$ with $$y$$ eliminated from
both $$E$$ and $$E'$$. Ch. 9, Prop. III tells us we can find $$E$$ by
setting $$z=1$$ in Eq. (\ref{eq:p2}) and eliminating $$y$$ from the
result. To find $$E'$$ we set $$z=0$$ and elimnate $$y$$ from the result.

We start by setting $$z=1$$ to get

$$\begin{align}
  \label{eq:p3}
  vx[(1-v')y + v'(1-y) + (1-v')(1-y)] &+ \\
  \nonumber
  v'y[(1-v)x + v(1-x) + (1-v)(1-x)] &+ \\
  \nonumber
  w[(1-w')y + w'(1-y) + (1-w')(1-y)] &+ \\
  \nonumber
  w'y(1-w) &
\end{align}$$

To elimnate $$y$$ we multiply the results of setting $$y=1$$ and $$y=0$$ in
Eq. (\ref{eq:p3}). Setting $$y=1$$ we get

$$\begin{align}
  \label{eq:p4}
  vx(1-v') + v'[(1-v)x + v(1-x) + (1-v)(1-x)] + w(1-w') +  w'(1-w)
\end{align}$$

Setting $$y=0$$ we get

$$\begin{align}
  \label{eq:p5}
  vx + w
\end{align}$$

We multiply these together. But by Ch. 9, we can discard any
constituent of a factor that is divisible by a constituent of the
other factor, as long as we add the discarded factors to the
result. So we can eliminate $$vx(1-v')$$ and $$w(1-w')$$
from (\ref{eq:p4}), and put them at the front of the product to get

$$\begin{align}
  vx(1-v') + w(1-w') + \\
  \nonumber
  [vx + w][v'(1-v)x + v'v(1-x) + v'(1-v)(1-x) + w'(1-w)]
\end{align}$$

Multiplying out, recognizing that $$v(1-v) = 0$$, $$x(1-x) = 0$$,
etc., and equivalently that $$v^2 = v$$ etc., and  putting terms in the
order $$v,v',w,w',x$$ regardless of whether it's positive or negative,
we get

$$\begin{align}
  \label{eq:p6}
  v(1-v')x + w(1-w') &+ \\
  \nonumber
  v(1-w)w'x + (1-v)v'wx + vv'w(1-x) + (1-v)v'w(1-x) &= E
\end{align}$$

Now we find $$E'$$ by first setting $$z=0$$ in (\ref{eq:p2}) to get

$$\begin{align}
  \label{eq:p7}
  vx[(1-v')y + v'(1-y) + (1-v')(1-y)] &+ \\
  \nonumber
  v'y[(1-v)x + v(1-x) + (1-v)(1-x)] + w'y & = 0
\end{align}$$

To eliminate $$y$$ we first set $$y=1$$ in the above to get

$$\begin{align}
  \label{eq:p8}
  v(1-v')x + (1-v)v'x + vv'(1-x) + (1-v)v'(1-x) + w'. 
\end{align}$$

Then we set $$y=0$$ to get

$$\begin{align}
  \label{eq:p9}
  vx 
\end{align}$$

Multiplying (\ref{eq:p8}) and (\ref{eq:p9}) this simplifies to 

$$\begin{align}
  \label{eq:p10}
  v(1-v')x + vxw' = E'
\end{align}$$

So we now have $$Ez + E'(1-z) = 0$$ with $$E$$ and $$E'$$ given in
(\ref{eq:p6}) and (\ref{eq:p10}) respectively. We can now try to
develop each of $$x$$, $$1-x$$, and $$vx$$ as a function of $$v,v',w,w',$$ and
$$z$$. We know that if we set $$z=1$$, then $$E = 0$$, so if we develop $$x$$
as a function of $$v,v',w,w'$$ to get $$x = \phi(v,v',w,w')$$ when $$z=1$$
and $$x=\phi'(v,v',w,w')$$ when $$z=0$$ we will find that

$$ x = \phi(v,v',w,w')z + \phi'(v,v',w,w')(1-z).$$

So our job is to solve for $$x$$ in $$E=0$$ and develop $$x$$ with resepct
to the other variables, and similarly for when $$E'=0$$. We start with
the case of $$E=0$$.

$$\begin{align}
  \label{eq:p11}
  v(1-v')x + w(1-w') &+ \\
  \nonumber
  v(1-w)w'x &+ (1-v)v'wx + vv'w(1-x) + (1-v)v'w(1-x) = 0\\
  v(1-v')x + w(1-w') &+ \\
  \nonumber
  v(1-w)w'x + (1-v)v'wx &+ vv'w - vv'wx + (1-v)v'w - (1-v)v'wx =0\\
  w(1-w') + vv'w + (1-v)v'w &-\\
  \nonumber
  x[vv'w + (1-v)v'w - v(1-v') &- v(1-w)w' - (1-v)v'w]=0
\end{align}$$

Whence

$$ x = \frac{w(1-w') + vv'w + (1-v)v'w}{[vv'w + (1-v)v'w - v(1-v') -
    v(1-w)w' - (1-v)v'w]} $$
    
and simplifying we find

$$\begin{align}
  \label{eq:x1}
  x = \frac{w[(1-w') + vv' + (1-v)v']}
  {v[v'w - (1-v') - (1-w)w']} = \phi(v,v',w,w')
\end{align}$$

Using $$\phi(v,v',w,w')$$ we get

$$\begin{align*}
  \mathbf{\phi(1,1,1,1)} &\mathbf{= \frac{1}{1}} &\phi(0,1,1,1) &= \frac{1}{0}
  &\phi(1,0,0,1) &= \frac{0}{-2}
  &\mathbf{\phi(0,1,0,0)} &\mathbf{= \frac{0}{0}}\\
  \phi(1,1,1,0) &= \frac{2}{1} &\mathbf{\phi(1,1,0,0)} &\mathbf{= \frac{0}{0}}
  &\mathbf{\phi(0,1,0,1)} &\mathbf{= \frac{0}{0}}
  &\phi(0,0,1,0) &= \frac{1}{0}\\
  \phi(1,1,0,1) &= \frac{0}{-1} &\phi(1,0,1,0) &= \frac{1}{-1}
  &\mathbf{\phi(0,0,1,1)} &\mathbf{= \frac{0}{0}}
  &\mathbf{\phi(0,0,0,1)} &\mathbf{= \frac{0}{0}}\\
  \phi(1,0,1,1) &= \frac{0}{-1} &\phi(0,1,1,0) &= \frac{2}{0}
  &\phi(1,0,0,0) &= \frac{0}{-1}
  &\mathbf{\phi(0,0,0,0)} &\mathbf{= \frac{0}{0}}
\end{align*}$$

So

$$\begin{align}
  \label{eq:xz}
\phi(v,v',w,w') &= vv'ww' + \frac{0}{0}\{vv'(1-w)(1-w') + ww'(1-v)(1-v') +
    (1-v)(1-w)\}
\end{align}$$

$$\fbox{This actually matches what Boole found!}$$

Starting from $$E'=0$$ and solving for $$x$$ we find

$$\begin{align}
  \nonumber
  v(1-v')x + vxw' &= 0\\
  \label{eq:x0}
  x = \frac{0}{v[(1-v')+ w']}&=\phi'(v,v',w,w')
\end{align}$$

Since $$w$$ does not enter into the formula for $$\phi'$$, we consider
$$\phi'$$ only as a function of $$v,v',$$ and $$w'$$. We start by noticing
that $$\phi'(0,v',w') = \frac{0}{0}$$ regardless of the values of $$v'$$
and $$w'$$. So we only need to list the values of $$\phi'(1,v',w')$$.

$$\begin{align*}
  \phi'(1,0,0) &= \frac{0}{1} &\phi'(1,0,1) &= \frac{0}{2}\\
  \mathbf{\phi'(1,1,0)} &\mathbf{= \frac{0}{0}} &\phi'(1,1,1) &= \frac{0}{1}
\end{align*}$$

This all tells us that

$$\begin{align}
  \label{eq:x1-z}
  \phi'(v,v',w,w') = \frac{0}{0}\{vv'(1-w') + (1-v)\}(1-z)
\end{align}$$

$$\fbox{This is also what Boole finds!}$$

Ok, so I made it work when solving for $$x$$. I need to check what
happens for the others. Let's start with solving for $$vx$$. Rather than
starting from (\ref{eq:p6}) and solving for $$vx$$, let's try starting
from (\ref{eq:x1}) and multiply both sides by $$v$$. This has the
advantage of adding $$v$$ to the right side which was confusing at
first. So we find

$$\begin{align}
  \label{eq:vx1}
  vx = \frac{vw[(1-w') + vv' + (1-v)v']}
  {v[v'w - (1-v') - (1-w)w']}.
\end{align}$$

That won't give us what Boole has, so what if we try canceling the
$$v$$s to get

$$\begin{align}
  \label{eq:vx1p}
  vx = \frac{w[(1-w') + v']}
  {[v'w - (1-v') - (1-w)w']}.
\end{align}$$

I didn't notice until now that I could eliminate an internal $$v$$ from
the numerator. So when I cancel the $$v$$ on the outside, we no longer
have a dependence on $$v$$. So let's try to make it work as a function
of $$v',w,w'$$.

$$\begin{align*}
  \mathbf{\phi(1,1,1)} &\mathbf{= \frac{1}{1}} &\phi(1,1,0) &= \frac{2}{1}\\
  \phi(1,0,1) &= \frac{0}{-1} &\mathbf{\phi(1,0,0)} &\mathbf{= \frac{0}{0}}\\
  \phi(0,1,1) &= \frac{0}{-1} &\phi(0,1,0) &= \frac{1}{-1}\\
  \phi(0,0,1) &= \frac{0}{-2} &\phi(0,0,0) &= \frac{0}{-1}
\end{align*}$$

This means that

$$\begin{align}
  \phi(v,v',w,w') = v'ww' + \frac{0}{0}v'(1-w)(1-w')
\end{align}$$

$$\fbox{This actually matches what Boole finds}$$ except he
includes $$v$$ in each of the terms.

This conclusion (with Boole's extra $$v$$) can be obtained directly
from (\ref{eq:xz}) by multiplying by $$v$$ and observing that $$v^2 =
v$$ and $$v(1-v) = 0$$.

All my other attempts to get Boole's result for this case fail for
some reason.

The first approach taken for determining $$vx$$ in terms of $$z$$
fails when I take the same approach for $$vx$$ in terms of
$$(1-z)$$. That is, when we multiply (\ref{eq:x0}) by $$v$$ we get: 

$$\begin{align}
  \label{eq:vx0p}
  vx = \frac{0}{[(1-v')+ w']}&=\phi'(v,v',w,w')
\end{align}$$

It's easy to see that this becomes

$$\begin{align}
  \phi'(v,v'w,w') = \frac{0}{0}v'(1-w')
\end{align}$$

$$\fbox{This does not match what Boole finds.}$$

Boole's answer is missing the factor of $$v'$$. If, instead, we take
the approach that worked for $$vx$$ in terms of $$z$$, we multiply
(\ref{eq:x1-z}) directly by $$v$$ to get

$$\begin{align}
  \phi'(v,v'w,w') = \frac{0}{0}vv'(1-w')
\end{align}$$

Here, we still have the factor $$v'$$ but we have added a new factor
of $$v$$. So something has gone wrong here.

We finally consider putting $$1-x$$ in terms of $$z$$ and $$1-z$$. On
page 235, Boole remarks that if development of $$w$$ gives $$A + 0B +
\frac{0}{0}C + \frac{1}{0}D$$, then the development of $$1-w$$ must
necessarily give $$B + 0A + \frac{0}{0}C + \frac{1}{0}D$$. We may thus
try to use this to our advantage in adapting (\ref{eq:xz}) and
(\ref{eq:x1-z}) (or rather the full set of equations above them).

Since (\ref{eq:xz}) shows $$A + \frac{0}{0}C$$, we must only determine
$$B$$ by looking at the equations above it. We see easily that

$$\begin{align*}
  B &= v(1-v')(1-w)w' + vv'(1-w)w' + v(1-v')ww' + v(1-v')(1-w)(1-w')\\
    &= v(1-w)w' + v(1-v')ww' + v(1-v')(1-w)(1-w')
\end{align*}$$

$$\fbox{This matches what Boole finds!}$$

Doing the same thing for finding $$1-x$$ in terms of $$1-z$$, we find that
 
$$\begin{align*}
  B &= v(1-v')(1-w') + v(1-v')w' + vv'w'\\
    &= v(1-v') + vv'w'\\
    &= v[(1-v') + v'w']
\end{align*}$$

$$\fbox{This is not what Boole finds.}$$

The value for $$B$$ that Boole finds is $$v(1-w)w'$$ which is baffling
mostly because of the dependence on $$1-w$$ which was already
eliminated by the time we got to (\ref{eq:p7}).

To summarize, of the 6 possible relations between $$x, vx, 1-x$$ on
$$z$$ and $$1-z$$, we succeed in four of them and fail at two of
them. The fact that our failures are both for relations to $$1-z$$ is
probably not a coincidence, and may suggest that the equations above
(\ref{eq:x1-z}) may be missing something. 


