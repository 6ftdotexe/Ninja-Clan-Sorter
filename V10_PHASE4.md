# V10 Phase 4 — Chronicle, Bingo Book & Profile Customization

Phase 4 closes V10 by turning each saved shinobi into a deeper character archive instead of only a collection of quiz results and gameplay systems.

## Added
- Shinobi Chronicle page at `/chronicle`
- Profile-aware lore draft generator
- Editable Origin Story, Academy History, Mentor History, Turning Point, Current Objective, and Personality Summary
- Bingo Book intelligence entry with alias, threat rating, intelligence notes, and strongest derived stats
- Persistent character timeline with generated baseline events and custom events
- Shinobi alias and public title
- Six profile themes: Void, Ember, Storm, Mist, Forest, and Sand
- Optional banner image and featured artwork URLs
- Public profiles now show Phase 4 customization, featured artwork, lore, and timeline when published
- Per-character persistence through Supabase RLS

## Design choice
The built-in lore generator is deterministic and profile-aware, so using the Chronicle does not consume paid image credits or incur an extra text-generation charge. Users can edit every generated lore field before publishing it.
