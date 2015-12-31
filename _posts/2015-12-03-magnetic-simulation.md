---
layout: post
title: LCSR Assembly Plugin
---

One of the applications I am interested in for my own research is teaching robots to perform complex assembly tasks. To do this, I use a magnetic simulation of a set of magnetic blocks.

A colleague of mine recently updated our (fairly crude) simulation to use a realistic model of the magnetic forces involved in the mating of these different plastic pieces, which is available on GitHub [here](https://github.com/jhu-lcsr/lcsr_assembly/tree/ascent) as a Gazebo plugin.

Here's a video showing the magnetic simulation in action:

<iframe width="420" height="315" src="https://www.youtube.com/embed/lrJWW1gROtk" frameborder="0" allowfullscreen></iframe>

I put this together using [our simulation of the WAM arm](https://github.com/jhu-lcsr/lcsr_barrett) running a JTNS controller. I am teleoperating the simulation with a Razer Hydra.
