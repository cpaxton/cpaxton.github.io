---
layout: post
title: Building a Behavior Tree with CoSTAR
---

CoSTAR is a framework we have been developing for authoring robot task plans. It is still very much a work in progress, but we are excited about how well it is coming a long.

A crucial part of letting end-users interact and program robots is giving them a framework that is powerful enough to solve their own problems, but adaptable enough that solutions won't fall apart at the slightest deviation. We achieve all this through our Behavior Tree-based user interface, which you can see in the video below.

<iframe width="560" height="315" src="https://www.youtube.com/embed/PXTdNY526S4" frameborder="0" allowfullscreen></iframe>

One of the key parts of this interface is our SmartMove operation. SmartMoves are special operations that take a list of predicate constraints on what constitutes a valid goal. In layman's terms, you can describe the qualities you want an object to have before you pick it up: something like "get me the next piece from the right side of the table," as show here.

<iframe width="560" height="315" src="https://www.youtube.com/embed/tiIYJT84xIs" frameborder="0" allowfullscreen></iframe>

