---
layout: post
title: Object Detection Test: Drill
---

Object detection is one of the biggest problems in robotics. Teaching robots how to perceive and interact with their world is extremely challenging, and has been the subject of many a PhD thesis.

In order for my robot to be able to intelligently use tools and assemble structures, it has to be able to see and percieve all of these objects, segmetn them out from the background, and understand what they are and how to use them. That's where this code comes in.

<iframe width="420" height="315" src="https://www.youtube.com/embed/5GfwD_XTb74" frameborder="0" allowfullscreen></iframe>

Shown here is an early test of an object segmentation/pose estimation system I am using for my current work. Poses are shown with red arrows, originating near the predicted center of the mesh. The model it is using was only trained to distinguish between the drill and a cluttered tabletop; with a keen eye you'll notice at least one mistake.

This code is based on a paper by Chi Li.
