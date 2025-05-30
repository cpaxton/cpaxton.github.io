---
layout: page
permalink: /labyrinth/index.html
title: Labyrinth
tags: [about, Chris, Paxton, Chris Paxton, labyrinth, LLMs]
categories: [virgil, labyrinth, LLMs]
chart: true
---

Labyrinth is a project by me, [Chris Paxton](https://cpaxton.github.io/), using AI to generate interactive, compelling worlds that you can explore.

Check it out as a part of [Virgil](https://github.com/cpaxton/virgil). Or explore...

## Places to explore

[The Labyrinth of Minos](/labyrinth/minos/index.html) - try to find the Minotaur's lair

[A haunted mansion](/labyrinth/haunted_mansion/index.html) - find the cursed amulet

[A dark forest](/labyrinth/dark_forest/index.html) - try to find the witch's house

[A strange city](/labyrinth/strange_city/index.html) - search for a powerful artifact

[Candyland](/labyrinth/candyland/index.html) - search for the Candy Castle

[A crumbling castle](/labyrinth/crumbling_castle/index.html) - try to find a treasure that grants eternal youth

[A high-tech research facility](/labyrinth/research_facility/index.html) - try to find an AI server containing the secrets of the universe

[An alien bazaar](/labyrinth/alien_bazaar/index.html) - try to find your rocket to fly home

[Erie, PA](/labyrinth/erie_pa/index.html) - try to find your lost flip-flop

## What is it?

It's a project based on my simple [Virgil](https://github.com/cpaxton/virgil) library, which uses AI to generate text and images. I've been using [Qwen 1.5](https://huggingface.co/collections/Qwen/qwen15-65c0a2f577b1ecb76d786524) and [Diffusers](https://huggingface.co/docs/diffusers/en/index) to generate the text and images, respectively. Through iteratively prompting the AI, I've been able to generate a series of interconnected rooms, each with its own unique description and image, starting from a really simple seed that looks something like this:

```yaml
world:
    goal: "a treasure chest containing an ancient relic that grants eternal youth"
    location: "a crumbling, ruined castle filled with traps and monsters"
    writing_style: "poetic, evocative, and mysterious; inspired by Edgar Allan Poe."
    image_style: "baroque oil painting; beautiful, sinister, and mysterious. high-quality painting."
```

... into an environment you can explore, filled with NPCs, challenges to overcome, etc. Of course, none of those things are really implemented in the current version of Labyrinth, but one day!


I hope you enjoy them. If you have any feedback, or want to see more, please let me know! You can reach me on [Twitter/X](https://twitter.com/chris_j_paxton) or [Bluesky](https://bsky.app/profile/cpaxton.bsky.social).

## Play More Games

- [Boat vs Kraken Game](/boat_game/index.html) - Use the arrow keys to move the boat and avoid the kraken. Collect the coins for points. Created with Perplexity.
- [Infinite Quiz Machine](/quiz/index.html) - A collection of AI-generated quizzes that are weird, fun, and a little bit uncanny.
