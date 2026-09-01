import {describe,expect,it} from 'vitest';
import {applyInteractiveBattleResult,characterCombatant} from '../../features/social';
import {effectiveCombatStats} from '../../features/training';
import {combatElement,elementalMultiplier,jutsuCooldownRounds} from '../../lib/minigames';
import type {EquipmentInventoryItem,ShinobiCharacter,TrainingProfile} from '../../types';

function character(id:string,name:string,chakra='Fire'):ShinobiCharacter{
  return {id,user_id:id==='a'?'user-1':null,name,clan:'Test Clan',village:'Konohagakure',chakra_primary:chakra,chakra_secondary:null,advanced_release:null,summon:null,sensei:null,shadow_mirror:null,rank:'Jōnin Potential',role:'Assault',leadership:'Adaptive',inherited_trait:null,specialization:'Close-range control',portrait_url:null,completion_percent:100,is_active:id==='a',is_public:true,public_slug:name.toLowerCase(),bio:null,published_at:null,shinobi_alias:null,profile_title:null,profile_theme:null,banner_url:null,featured_art_url:null,created_at:'2026-01-01',updated_at:'2026-01-01'};
}

describe('interactive combat integration',()=>{
  it('records the controlled shinobi as winner after an interactive victory',()=>{
    const left=character('a','Alpha','Fire');
    const right=character('b','Beta','Wind');
    const analysis=applyInteractiveBattleResult(left,right,left.id,{score:86,won:true,rounds:6,hp:72,chakra:38});
    expect(analysis.winnerId).toBe(left.id);
    expect(analysis.winnerName).toBe(left.name);
    expect(analysis.summary).toContain('Interactive tactical battle');
    expect(analysis.leftScore).toBeGreaterThan(analysis.rightScore);
  });

  it('records the opponent as winner after an interactive defeat',()=>{
    const left=character('a','Alpha');
    const right=character('b','Beta');
    const analysis=applyInteractiveBattleResult(left,right,left.id,{score:34,won:false,rounds:8,hp:0,chakra:11});
    expect(analysis.winnerId).toBe(right.id);
    expect(analysis.winnerName).toBe(right.name);
  });

  it('combines training and equipped-item bonuses into effective combat stats',()=>{
    const base=characterCombatant(character('a','Alpha')).stats;
    const training:TrainingProfile={character_id:'a',training_points:0,ryo:0,bonuses:{ninjutsu:5,speed:2},total_bonus:7};
    const equipment=[{id:'eq',character_id:'a',user_id:'user-1',item_id:'test',slot:'weapon',equipped:true,acquired_at:'2026-01-01',item:{id:'test',name:'Test Blade',slot:'weapon',price:0,description:'',bonuses:{ninjutsu:3,speed:1}}}] satisfies EquipmentInventoryItem[];
    const effective=effectiveCombatStats(base,training,equipment);
    expect(effective.ninjutsu).toBe(base.ninjutsu+8);
    expect(effective.speed).toBe(base.speed+3);
  });

  it('applies the five-nature elemental advantage cycle',()=>{
    expect(elementalMultiplier('Fire','Wind')).toBeGreaterThan(1);
    expect(elementalMultiplier('Water','Fire')).toBeGreaterThan(1);
    expect(elementalMultiplier('Wind','Fire')).toBeLessThan(1);
    expect(elementalMultiplier('Earth','Earth')).toBe(1);
    expect(combatElement('Lightning + Wind')).toBe('Wind');
  });

  it('scales jutsu cooldowns by rank',()=>{
    expect(jutsuCooldownRounds('D')).toBe(1);
    expect(jutsuCooldownRounds('B')).toBe(2);
    expect(jutsuCooldownRounds('S')).toBe(4);
  });

});
