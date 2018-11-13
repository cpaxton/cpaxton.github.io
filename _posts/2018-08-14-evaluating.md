---
layout: post
title: Can Non-Experts Use CoSTAR?
tags: [video, planning, robot, real-robot,
ur5, costar]
comments: true
share: true
description: "Evaluating Methods for End-User Creation of Robot Task Plans"
---

How can we enable users to create effective, perception-driven task plans for collaborative robots?

We conducted a 35-person user study with the Behavior Tree-based CoSTAR system to determine which strategies for end user creation of generalizable robot task plans are most usable and effective.

As a part of CoSTAR's wide range of capabilities, it allows users to specify SmartMoves: abstract goals such as ``pick up component A from the right side of the table.'' Users were asked to perform pick-and-place assembly tasks with either SmartMoves or one of three simpler baseline versions of CoSTAR. Overall, participants found CoSTAR to be highly usable, with an average System Usability Scale score of 73.4 out of 100. SmartMove also helped users perform tasks faster and more effectively; all SmartMove users completed the first two tasks, while not all users completed the tasks using the other strategies. SmartMove users showed better performance for incorporating perception across all three tasks.

Our newest finished paper, to be presented at IROS 2018, is the end result of a bunch of user study work I have written about here in the past. Check out a video summarizing CoSTAR and some of our work below.

<iframe width="560" height="315" src="https://www.youtube.com/embed/uxfKluW-OWI" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

You can find the paper on [my website]({{site.baseurl}}public/paxton2018evaluating.pdf). As usual, all the [CoSTAR code](https://github.com/cpaxton/costar_stack) is available on Github.

If you find our work interesting, please cite the paper as:
```
@article{paxton2018evaluating,
  title={Evaluating Methods for End-User Creation of Robot Task Plans},
  author={Paxton, Chris and Jonathan, Felix and Hundt, Andrew  and Mutlu, Bilge and Hager, Gregory D},
  journal={Intelligent Robots and Systems (IROS), 2018 IEEE International Conference on},
  note={to appear},
  year={2018}
}
```

It is also [available on ArXiV](https://arxiv.org/abs/1811.02690).