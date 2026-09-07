# Intentionally Deferred

Systems that exist in the design but are deliberately **not** built yet. The
game is about to be audited by hand, start to finish; nothing here should be
started before that audit produces its own list.

## Ship potential and archetypes

The design describes more than V1 implements:

- **Size Potential** — a hull that can be expanded beyond its current class.
- **Specialised ship potential** — hulls that are naturally better at one role.
- **Deeper archetypes** — beyond the current derived label (Light Freighter,
  Medical Tender, and so on), archetypes that carry mechanical weight.
- **Long-term hull expansion** — adding rooms and capacity over a campaign.

Ships currently generate with fixed size, rooms, systems and quality potential.
That is enough to play. Building the expansion path now would add a major
system immediately before manual playtesting, which is exactly the wrong order.

## Reputation

The design calls for reputation earned from *observed behaviour* rather than
from hidden trait labels — what people saw you do, spreading by word of mouth.
Relationships and trait discovery already exist and carry most of the weight in
V1. Reputation proper waits.

## Trait change

Rare, major campaign events that permanently change one trait on one person.
The hooks exist (traits, evidence, discovery); the events do not. Deferred so
that trait change, when it arrives, lands on a game whose event content has
already been played and judged.

## Species

The world assumes other peoples exist and the content refers to them, but
almost nothing is modelled.

What exists today: one named species per run, drawn from a pool of seven, given
to the ocean planet — "Home of the Vesk". A handful of authored events reference
non-humans, and the transit station's description mentions several species. The
name library carries 200 male, 200 female and 200 surname entries built from
different sound shapes, ready and unused.

What does not exist: any species field on a character. Every generated person —
crew, family, recruit, hostile — is human. Nothing in the engine knows
otherwise.

Making species real means, at minimum: a field on Character, name pools per
species, and reactions from other characters. Whether it also means different
attribute ranges, different wounds, or different needs is the design question
that decides how large the job is.

Note that creatures and species are separate problems. The bestiary is thin —
two animals (hull vermin, shore fauna) and one machine family (drones) across
fifteen encounters — but adding a hostile animal only needs an encounter
template. Adding a people needs the system above.

## Communications and translation

Held at the owner's explicit request until the current game stabilises.

Possibilities when it is taken up:

- ship-to-ship and ship-to-ground contact, with range and quality
- signal degradation, jamming, and silence as a real state
- distress calls that can be sent as well as received
- occasional translation problems with other species, so understanding is not
  free and a good communicator is worth carrying

None of this is built. It is written down so it is not lost.

## Not deferred — deliberately excluded

**Under-13 characters.** This is a dangerous expedition, and the game will not
model bringing small children into it. The minimum age for any simulated,
recruitable, playable character is 13. Younger children may exist in narration;
they are never Character objects and never participate mechanically.
