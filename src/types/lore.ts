export type ProfileTheme='ember'|'storm'|'mist'|'forest'|'sand'|'void';

export type CharacterLore={
  character_id:string;
  user_id:string;
  origin_story:string;
  academy_history:string;
  mentor_history:string;
  turning_point:string;
  current_objective:string;
  personality_summary:string;
  bingo_alias:string;
  threat_rating:string;
  intelligence_notes:string;
  updated_at:string;
};

export type TimelineEvent={
  id:string;
  character_id:string;
  user_id:string;
  event_type:string;
  title:string;
  detail:string;
  event_order:number;
  created_at:string;
};

export type ProfileCustomization={
  shinobi_alias:string|null;
  profile_title:string|null;
  profile_theme:ProfileTheme|null;
  banner_url:string|null;
  featured_art_url:string|null;
};
