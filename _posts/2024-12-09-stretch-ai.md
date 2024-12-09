---
layout: post
title: Stretch AI, an Open-Source Embodied AI Stack for Mobile Manipulation
---

I've been working on a set of tools to make it easy to test embodied AI tools and systems in homes: [Stretch AI](https://github.com/hello-robot/stretch_ai/), a set of open-source tools for language-guided autonomy, exploration, navigation, and learning from demonstration.

The goal is to allow researchers and developers to quickly build and deploy AI-enabled home robot applications.

{% include youtube.html id="MJ3Ji1m0MtY" %}

Stretch AI is designed so that you can easily get started and try it out on your robot. It supports multiple LLMs, from open-source models like Qwen to OpenAI.

You can even give voice commands to the robot and tell it to perform complex, multi-step tasks:

{% include youtube.html id="Jbu4XU7VYRQ" %}

In addition, we have our own fork of the [HuggingFace LeRobot](https://github.com/hello-robot/lerobot) library, which lets you perform leearning from demonstration. You can use [Dex Teleop](https://github.com/hello-robot/stretch_dex_teleop) to collect multiple demonstrations and train a policy in your environment, which can then be deployed on the robot:

{% include youtube.html id="JJgvcSWUqps" %}

These can then be combined sequentially to create more complex skills. Tell a robot to go and open the cupboard and take out a bottle and it can chain actions together using your trained Diffusion Policy skills. There's support for a number of different large language models as well, including OpenAI's GPT-4o, Qwen, and more.

{% include youtube.html id="NRSnOJVS_ic" %}

We also support cutting-edge research like [DynaMem](https://dynamem.github.io/), which allows you to handle dynamic and changing environments.

{% include youtube.html id="7XZDVqsTdqU" %}

On a personal note, this is something I've wanted to build since I left NVIDIA ~2.5 years ago -- I think it's so important to have good, open, easy-to-use tools for mobile robotics research in AI. I'm looking forward to seeing what people can build with it!

I also wrote up a [blog post with a few more details](https://itcanthink.substack.com/p/introducing-stretch-ai) if you would like to learn more.

Social media:
  * [Twitter/X thread](https://twitter.com/chris_j_paxton/status/1863997206883164230)
  * [Bluesky thread](https://bsky.app/profile/cpaxton.bsky.social/post/3lcg3wljzns2s)

Read more:
  * [Stretch AI on Github](https://github.com/hello-robot/stretch_ai/)
  * [Hello Robot’s Stretch AI toolkit explores embodied intelligence](https://www.therobotreport.com/stretch-ai-toolkit-explore-embodied-intelligence/) - The Robot Report
  * [Stretch AI launch and the Chinese perspective of AI and humanoid robots](https://robotsandstartups.substack.com/p/stretch-ai-launch-and-chinese-perspective) - on Robots & Startups by Andrea Keay
  * [Instroducing Stretch AI on It Can Think! Substack](https://itcanthink.substack.com/p/introducing-stretch-ai) - Chris Paxton's Substack
