# V10 Phase 2 — Missions & Progression

Phase 2 turns each saved shinobi into a progressing field operative.

## Added
- Per-character XP and levels
- D/C/B/A/S mission generation based on current character level
- Missions shaped by the normalized identity profile and strongest combat stats
- Accept, resolve, abandon, and history flows
- Village reputation and reputation titles
- Operational rank progression from Genin through Kage
- Kage promotion requires both field accomplishments and Kage/Legendary rank potential
- Mission achievements and rank-specific badges
- Per-character mission record with D/C/B/A/S completion counts
- Atomic Supabase mission completion RPC so rewards and mission status update together
- Failure still awards reduced field XP but no village reputation or completion credit

## Progression loop
Open a saved shinobi → generate assignment → accept → resolve → earn XP/reputation → level up → unlock harder mission ranks.
