import type { Answer, Outcome, Question, TestDefinition, TestId } from '../../types/quiz';

const answer = (text: string, scores: Record<string, number>): Answer => ({ text, scores });
const question = (id: string, theme: string, prompt: string, answers: Answer[]): Question => ({ id, theme, prompt, answers });
const outcome = (id: string, label: string, symbol: string, description: string): Outcome => ({ id, label, symbol, description });

function makeTest(
  id: TestId,
  label: string,
  shortLabel: string,
  icon: string,
  description: string,
  outcomes: Outcome[],
  questions: Question[],
): TestDefinition {
  return {
    id,
    label,
    shortLabel,
    icon,
    description,
    questionCount: questions.length,
    lengths: { short: 5, medium: 8, long: 10 },
    questions,
    outcomes: Object.fromEntries(outcomes.map((item) => [item.id, item])),
  };
}

export const fightingTest = makeTest(
  'fighting',
  'Fighting Style',
  'Fighting Style',
  '⚔',
  'Discover the combat philosophy that best matches your instincts.',
  [
    outcome('close', 'Close-Range Pressure', '拳', 'You thrive by taking space, forcing reactions, and staying inside an opponent’s comfort zone.'),
    outcome('precision', 'Precision Striker', '針', 'You prefer clean openings, efficient movement, and decisive attacks over wasted motion.'),
    outcome('control', 'Field Controller', '陣', 'You win by shaping distance, tempo, positioning, and the choices available to everyone else.'),
    outcome('adaptive', 'Adaptive Fighter', '変', 'You are strongest when reading the situation and changing plans faster than the opponent can adjust.'),
    outcome('support', 'Support Fighter', '援', 'Your instincts naturally create openings, protection, and momentum for the rest of the squad.'),
    outcome('stealth', 'Stealth Specialist', '影', 'You prefer information, concealment, misdirection, and attacking only when the situation favors you.'),
  ],
  [
    question('fight-1', 'Opening', 'A fight starts before either side has a complete plan. What do you do first?', [
      answer('Close the gap immediately and force them to react to me.', { close: 5, adaptive: 1 }),
      answer('Stay composed and wait for the first clean mistake.', { precision: 5, stealth: 1 }),
      answer('Take the best position and limit where they can move.', { control: 5, support: 1 }),
      answer('Probe with a safe action, read the response, then change gears.', { adaptive: 5, precision: 1 }),
    ]),
    question('fight-2', 'Pressure', 'A stronger opponent is walking your team backward. What feels most natural?', [
      answer('Meet the pressure directly and make them work for every step.', { close: 5, control: 1 }),
      answer('Create a narrow opening and punish one overextension.', { precision: 5, stealth: 1 }),
      answer('Redirect the encounter so their strength matters less.', { control: 5, adaptive: 2 }),
      answer('Cover teammates and create a safe reset for the squad.', { support: 5, control: 1 }),
    ]),
    question('fight-3', 'Tempo', 'Which pace gives you the biggest advantage?', [
      answer('Fast, physical, and relentless.', { close: 5 }),
      answer('Measured, with short bursts when the opening appears.', { precision: 5 }),
      answer('A pace I can constantly change to keep them guessing.', { adaptive: 5 }),
      answer('Slow enough that I can disappear from their expectations.', { stealth: 5, control: 1 }),
    ]),
    question('fight-4', 'Team', 'Your teammate commits to an attack that is about to fail. What do you do?', [
      answer('Join them and turn the bad commitment into overwhelming pressure.', { close: 4, support: 2 }),
      answer('Hit the exact weakness created by the opponent’s response.', { precision: 5 }),
      answer('Cut off the opponent’s escape route so the attack can still work.', { control: 5, support: 2 }),
      answer('Change my role instantly and cover whatever the team now lacks.', { adaptive: 5, support: 2 }),
    ]),
    question('fight-5', 'Information', 'You know almost nothing about the opponent. What gives you confidence?', [
      answer('I can test their limits up close and learn while moving.', { close: 4, adaptive: 2 }),
      answer('I only need one reliable pattern to exploit.', { precision: 5 }),
      answer('I can make the environment tell me how they want to fight.', { control: 5 }),
      answer('I can stay difficult to read until I know enough to commit.', { stealth: 5, adaptive: 1 }),
    ]),
    question('fight-6', 'Defense', 'Your opponent launches a complicated combination. Your preferred defense?', [
      answer('Crowd them so they cannot complete the sequence cleanly.', { close: 5 }),
      answer('Evade the minimum amount and counter the weakest transition.', { precision: 5 }),
      answer('Break their spacing and force the sequence into a bad angle.', { control: 5 }),
      answer('Protect the teammate most exposed by the attack.', { support: 5 }),
    ]),
    question('fight-7', 'Reputation', 'Which reputation sounds best?', [
      answer('Impossible to push backward.', { close: 5 }),
      answer('Rarely wastes a movement.', { precision: 5 }),
      answer('Makes every encounter happen on their terms.', { control: 5 }),
      answer('Never fights the same way twice.', { adaptive: 5 }),
    ]),
    question('fight-8', 'Squad Value', 'What contribution to a squad feels most satisfying?', [
      answer('Breaking through the point everyone else is stuck on.', { close: 4, support: 1 }),
      answer('Ending the key threat before it becomes a larger problem.', { precision: 5 }),
      answer('Making the entire team safer and more effective.', { support: 5, control: 1 }),
      answer('Finding the unseen angle that changes the whole mission.', { stealth: 5, adaptive: 1 }),
    ]),
    question('fight-9', 'Mistake', 'An opponent correctly predicts your favorite approach. What next?', [
      answer('Double down with more pressure and make prediction irrelevant.', { close: 5 }),
      answer('Use the prediction itself to create a false opening.', { precision: 4, stealth: 3 }),
      answer('Change the terrain or spacing before engaging again.', { control: 5 }),
      answer('Abandon the approach completely and build a new plan mid-fight.', { adaptive: 5 }),
    ]),
    question('fight-10', 'Peak', 'At your best, what does the fight feel like?', [
      answer('The opponent never gets enough room to breathe or reset.', { close: 5 }),
      answer('Everything slows down until the correct opening becomes obvious.', { precision: 5 }),
      answer('Every person on the field is moving where I expected them to.', { control: 5 }),
      answer('The opponent realizes too late that they never understood my plan.', { stealth: 4, adaptive: 3 }),
    ]),
  ],
);

export const weaponTest = makeTest(
  'weapon',
  'Weapon Affinity',
  'Weapon',
  '⌁',
  'Find the shinobi tool style that feels most natural to you.',
  [
    outcome('blade', 'Blade Specialist', '刀', 'You favor direct control, clean technique, and a weapon that rewards precision at close range.'),
    outcome('projectile', 'Projectile Specialist', '手', 'You prefer range, angles, timing, and forcing opponents to respect multiple lines of attack.'),
    outcome('staff', 'Staff Specialist', '棒', 'You value reach, balance, defense, and a tool that adapts to many situations.'),
    outcome('chain', 'Flexible Weapon Specialist', '鎖', 'You are drawn to unusual range, entanglement, momentum, and controlling unpredictable space.'),
    outcome('unarmed', 'Unarmed Specialist', '拳', 'You trust movement, timing, conditioning, and your own body more than external equipment.'),
    outcome('none', 'Technique-First Shinobi', '術', 'Your instinct is to rely primarily on chakra, ninjutsu, and tactics rather than a signature weapon.'),
  ],
  [
    question('weapon-1', 'Feel', 'Which quality matters most in a signature fighting tool?', [
      answer('Immediate precision and dependable control.', { blade: 5 }),
      answer('Reach and the ability to threaten from different angles.', { projectile: 4, staff: 2 }),
      answer('Versatility between offense, defense, and movement.', { staff: 5, chain: 1 }),
      answer('I would rather build my style around chakra and movement than a weapon.', { none: 5, unarmed: 2 }),
    ]),
    question('weapon-2', 'Distance', 'What distance feels most comfortable?', [
      answer('Close enough that small technical differences decide everything.', { blade: 4, unarmed: 3 }),
      answer('Far enough that positioning and accuracy matter more than strength.', { projectile: 5 }),
      answer('Just outside normal striking range where I can control entry.', { staff: 5 }),
      answer('A constantly changing distance that is awkward for the opponent.', { chain: 5 }),
    ]),
    question('weapon-3', 'Training', 'Which training session sounds most satisfying?', [
      answer('Repeating precise cuts and transitions until they are automatic.', { blade: 5 }),
      answer('Hitting small moving targets from increasingly difficult positions.', { projectile: 5 }),
      answer('Footwork, leverage, guards, and combinations with a long weapon.', { staff: 5 }),
      answer('Conditioning, body mechanics, and chakra control without depending on gear.', { unarmed: 4, none: 3 }),
    ]),
    question('weapon-4', 'Problem Solving', 'An opponent has a strong defensive guard. How do you want to solve it?', [
      answer('Find the exact seam and cut through the structure of the guard.', { blade: 5 }),
      answer('Attack from multiple angles until they cannot cover all of them.', { projectile: 5 }),
      answer('Use leverage and reach to move the guard where I want it.', { staff: 5 }),
      answer('Entangle, redirect, or pull the guard out of position.', { chain: 5 }),
    ]),
    question('weapon-5', 'Mobility', 'Which style best matches how you like to move?', [
      answer('Compact footwork with sharp entries and exits.', { blade: 5 }),
      answer('Constant repositioning to preserve lines of sight.', { projectile: 5 }),
      answer('Grounded movement with strong balance and circular control.', { staff: 5 }),
      answer('Free movement where my hands, feet, and chakra are always available.', { unarmed: 4, none: 2 }),
    ]),
    question('weapon-6', 'Creativity', 'What kind of creativity appeals to you most?', [
      answer('Finding many techniques inside one simple, reliable weapon.', { blade: 4, staff: 2 }),
      answer('Using ricochets, trajectories, traps, and timing.', { projectile: 5 }),
      answer('Turning momentum and unusual angles into control.', { chain: 5 }),
      answer('Combining ninjutsu, movement, feints, and terrain without a fixed tool.', { none: 5, unarmed: 1 }),
    ]),
    question('weapon-7', 'Reliability', 'If you could carry only one option for a long mission, what sounds safest?', [
      answer('A well-maintained blade I know completely.', { blade: 5 }),
      answer('A compact set of ranged tools with several uses.', { projectile: 5 }),
      answer('A durable staff that works as weapon, defense, and utility tool.', { staff: 5 }),
      answer('Nothing essential—I want my body and chakra to remain the core of the style.', { unarmed: 3, none: 4 }),
    ]),
    question('weapon-8', 'Control', 'How do you most want a weapon to influence an opponent?', [
      answer('Make them respect every close-range opening.', { blade: 5 }),
      answer('Make them constantly worry about where the next attack comes from.', { projectile: 5 }),
      answer('Keep them exactly at the distance I choose.', { staff: 5 }),
      answer('Make their movement awkward through wraps, arcs, and changing reach.', { chain: 5 }),
    ]),
    question('weapon-9', 'Identity', 'Which statement sounds most like you?', [
      answer('Master one elegant tool deeply.', { blade: 5 }),
      answer('Accuracy and preparation beat raw force.', { projectile: 5 }),
      answer('Versatility is more valuable than specialization.', { staff: 4, none: 2 }),
      answer('My body and techniques should be enough even if every tool is taken away.', { unarmed: 4, none: 3 }),
    ]),
    question('weapon-10', 'Peak', 'At your peak, what makes your style impressive?', [
      answer('The blade seems like an extension of thought.', { blade: 5 }),
      answer('The opponent is pressured from angles they cannot track at once.', { projectile: 5 }),
      answer('Range and leverage make every exchange look controlled.', { staff: 5 }),
      answer('The style is impossible to disarm because no single tool defines it.', { unarmed: 3, none: 4, chain: 1 }),
    ]),
  ],
);

export const leadershipTest = makeTest(
  'leadership',
  'Leadership Style',
  'Leadership',
  '♜',
  'Learn how you naturally guide a squad under pressure.',
  [
    outcome('commander', 'Commander', '令', 'You create clarity through decisive direction and are comfortable owning the final call.'),
    outcome('strategist', 'Strategist', '策', 'You lead by understanding the board, building contingencies, and putting people where they succeed.'),
    outcome('inspirer', 'Inspirer', '火', 'You raise performance through confidence, momentum, and belief in the people around you.'),
    outcome('guardian', 'Guardian', '盾', 'You lead through responsibility, protection, and making sure nobody is left behind.'),
    outcome('independent', 'Lead-by-Example', '孤', 'You prefer autonomy, competence, and influence earned through action rather than constant direction.'),
  ],
  [
    question('lead-1', 'Crisis', 'The squad freezes during a sudden crisis. What do you do?', [
      answer('Give immediate assignments and establish a clear chain of action.', { commander: 5 }),
      answer('Identify the real problem, then assign people based on strengths.', { strategist: 5 }),
      answer('Get everyone moving by restoring confidence and urgency.', { inspirer: 5 }),
      answer('Stabilize the most exposed teammate first, then rebuild the formation.', { guardian: 5 }),
    ]),
    question('lead-2', 'Planning', 'How should a team prepare for an uncertain mission?', [
      answer('Everyone should know the objective, role, and who makes the final call.', { commander: 5 }),
      answer('Build several branches so the plan survives unexpected changes.', { strategist: 5 }),
      answer('Make sure everyone understands why the mission matters and trusts one another.', { inspirer: 5 }),
      answer('Give capable people room to solve their part without micromanagement.', { independent: 5 }),
    ]),
    question('lead-3', 'Failure', 'A teammate makes a costly mistake. Your first leadership response?', [
      answer('Take control of the immediate situation, then address the mistake later.', { commander: 5 }),
      answer('Understand which assumption or process failed.', { strategist: 5 }),
      answer('Keep the mistake from destroying their confidence.', { inspirer: 4, guardian: 2 }),
      answer('Protect the team from further consequences and help them recover.', { guardian: 5 }),
    ]),
    question('lead-4', 'Authority', 'What makes someone worth following?', [
      answer('They can make hard decisions when nobody else wants to.', { commander: 5 }),
      answer('Their plans consistently account for details others miss.', { strategist: 5 }),
      answer('People become better around them.', { inspirer: 5 }),
      answer('They never ask others to do something they would not do themselves.', { independent: 5, guardian: 1 }),
    ]),
    question('lead-5', 'Conflict', 'Two talented teammates strongly disagree. What do you do?', [
      answer('Hear both sides, decide, and move the team forward.', { commander: 5 }),
      answer('Test both arguments against the mission constraints.', { strategist: 5 }),
      answer('Find the shared goal and rebuild cooperation around it.', { inspirer: 5 }),
      answer('Let them own their areas unless the conflict begins hurting the team.', { independent: 5 }),
    ]),
    question('lead-6', 'Risk', 'A mission can succeed faster if one person takes a major risk. Your instinct?', [
      answer('Choose the best person and make the call if the objective justifies it.', { commander: 5 }),
      answer('Look for a lower-risk route that produces nearly the same result.', { strategist: 4, guardian: 2 }),
      answer('Ask for a volunteer and make sure they know the team believes in them.', { inspirer: 4, independent: 1 }),
      answer('Avoid making one teammate carry a risk the whole squad could share.', { guardian: 5 }),
    ]),
    question('lead-7', 'Growth', 'How do you help a talented but inconsistent teammate improve?', [
      answer('Set a clear standard and hold them accountable to it.', { commander: 5 }),
      answer('Diagnose exactly where their process breaks down.', { strategist: 5 }),
      answer('Help them see what they can become and build momentum.', { inspirer: 5 }),
      answer('Give them ownership and let responsibility force growth.', { independent: 5 }),
    ]),
    question('lead-8', 'Protection', 'Your plan works, but a teammate is becoming overwhelmed. What happens?', [
      answer('Reassign roles immediately so the mission remains stable.', { commander: 4, guardian: 2 }),
      answer('Adjust the plan around the new limitation.', { strategist: 5 }),
      answer('Stay close enough to keep them engaged and confident.', { inspirer: 4, guardian: 2 }),
      answer('Take pressure off them even if it costs efficiency.', { guardian: 5 }),
    ]),
    question('lead-9', 'Presence', 'How do you want a squad to feel when you are present?', [
      answer('Clear about what happens next.', { commander: 5 }),
      answer('Prepared for more possibilities than the opposition.', { strategist: 5 }),
      answer('More confident and capable than they were alone.', { inspirer: 5 }),
      answer('Safe enough to focus completely on their jobs.', { guardian: 5 }),
    ]),
    question('lead-10', 'Legacy', 'What would be the best proof of your leadership?', [
      answer('The team can act decisively even when I am absent.', { commander: 4, independent: 2 }),
      answer('The systems and plans I built keep working after I leave.', { strategist: 5 }),
      answer('People I led eventually surpass me.', { inspirer: 5 }),
      answer('People trust me because I consistently carried my share without demanding attention.', { independent: 4, guardian: 2 }),
    ]),
  ],
);

export const rankTest = makeTest(
  'rank',
  'Rank Potential',
  'Rank',
  '★',
  'Estimate the level of responsibility your answers point toward.',
  [
    outcome('genin', 'Genin Potential', '下', 'Your profile favors learning through direct experience while core instincts are still developing.'),
    outcome('chunin', 'Chūnin Potential', '中', 'You show the reliability and judgment expected from a dependable field operator.'),
    outcome('special', 'Special Jōnin Potential', '特', 'You show unusually strong specialist ability even if you are not built around broad command.'),
    outcome('jonin', 'Jōnin Potential', '上', 'You combine independence, tactical judgment, versatility, and responsibility at a high level.'),
    outcome('elite', 'Elite Jōnin Potential', '精', 'Your profile points toward exceptional field capability and the ability to solve high-risk problems independently.'),
    outcome('kage', 'Kage Candidate', '影', 'You combine elite ability with strategic responsibility, leadership, and village-scale judgment.'),
  ],
  [
    question('rank-1', 'Responsibility', 'A mission begins failing for reasons outside your assignment. What do you do?', [
      answer('Focus on my assigned role and ask for direction before changing it.', { genin: 5, chunin: 1 }),
      answer('Adjust my part and communicate the change clearly to the squad.', { chunin: 5 }),
      answer('Take ownership of the immediate problem if it matches my expertise.', { special: 5, jonin: 1 }),
      answer('Reassess the entire mission and coordinate a new direction.', { jonin: 4, elite: 2, kage: 1 }),
    ]),
    question('rank-2', 'Judgment', 'You receive an order that no longer fits the situation. What is your instinct?', [
      answer('Follow it unless someone senior changes the instruction.', { genin: 5 }),
      answer('Use reasonable judgment within the intent of the order.', { chunin: 5 }),
      answer('Ignore the original method if my specialty gives me a clearly better solution.', { special: 4, jonin: 2 }),
      answer('Make the best decision available and be ready to fully own the consequences.', { jonin: 4, elite: 3, kage: 2 }),
    ]),
    question('rank-3', 'Scope', 'Which responsibility sounds most natural?', [
      answer('Execute my role well and keep learning.', { genin: 5 }),
      answer('Coordinate a small team through a defined objective.', { chunin: 5 }),
      answer('Be the expert called when one difficult problem needs solving.', { special: 5 }),
      answer('Lead complex missions where the plan will probably change several times.', { jonin: 4, elite: 2 }),
    ]),
    question('rank-4', 'Uncertainty', 'How much uncertainty can you comfortably own?', [
      answer('I perform best with clear expectations and feedback.', { genin: 5 }),
      answer('I can handle normal field uncertainty if the objective is clear.', { chunin: 5 }),
      answer('A lot, as long as the problem is inside my strongest discipline.', { special: 5 }),
      answer('I am comfortable making high-impact decisions with incomplete information.', { elite: 4, jonin: 3, kage: 2 }),
    ]),
    question('rank-5', 'Team', 'A less-experienced teammate is struggling during a mission. What do you do?', [
      answer('Help with the immediate task and look to the leader for the larger adjustment.', { genin: 4, chunin: 2 }),
      answer('Coach them enough to keep the squad functioning.', { chunin: 5 }),
      answer('Cover the technical weakness if it falls inside my specialty.', { special: 5 }),
      answer('Adjust assignments so they can succeed without compromising the mission.', { jonin: 5, elite: 1 }),
    ]),
    question('rank-6', 'Complexity', 'Which mission would you rather receive?', [
      answer('A clear objective where I can prove fundamentals.', { genin: 5 }),
      answer('A multi-step field mission with a small team.', { chunin: 5 }),
      answer('A difficult assignment chosen specifically for my rare skill set.', { special: 5 }),
      answer('A high-risk mission where success depends on independent judgment.', { elite: 4, jonin: 3 }),
    ]),
    question('rank-7', 'Leadership', 'How naturally do you take responsibility for other people’s decisions?', [
      answer('I would rather master my own decisions first.', { genin: 5, special: 1 }),
      answer('I can supervise a small group when roles are clear.', { chunin: 5 }),
      answer('I prefer expert responsibility over broad command.', { special: 5 }),
      answer('I am comfortable owning both the plan and the people executing it.', { jonin: 4, elite: 2, kage: 3 }),
    ]),
    question('rank-8', 'Failure', 'A major mission fails under your command. What happens next?', [
      answer('I need senior guidance to understand what I missed.', { genin: 5 }),
      answer('I review my decisions and improve the process for the next mission.', { chunin: 5 }),
      answer('I identify whether my expertise failed or was used incorrectly.', { special: 5 }),
      answer('I take responsibility, protect the team from blame-shifting, and rebuild the strategy.', { jonin: 3, elite: 4, kage: 3 }),
    ]),
    question('rank-9', 'Village', 'What kind of impact sounds most satisfying?', [
      answer('Becoming clearly stronger and more capable than I am now.', { genin: 5 }),
      answer('Being someone others can reliably put in charge of a squad.', { chunin: 5 }),
      answer('Becoming one of the village’s best people in a specific discipline.', { special: 5, elite: 1 }),
      answer('Shaping how the village handles its hardest problems.', { elite: 3, kage: 5, jonin: 1 }),
    ]),
    question('rank-10', 'Peak', 'At your peak, which description fits best?', [
      answer('A talented shinobi with huge room to grow.', { genin: 5 }),
      answer('A trusted squad leader who consistently gets people home.', { chunin: 5, jonin: 1 }),
      answer('A specialist whose name is known across villages for one discipline.', { special: 5, elite: 2 }),
      answer('A top-level operative trusted with missions that can affect the whole village.', { elite: 4, jonin: 2, kage: 4 }),
    ]),
  ],
);

export const inheritedTest = makeTest(
  'inherited',
  'Inherited Potential',
  'Inherited',
  '◉',
  'Explore the type of rare inherited aptitude your profile suggests.',
  [
    outcome('dojutsu', 'Ocular Potential', '眼', 'Your profile emphasizes observation, perception, prediction, and information processed through sight.'),
    outcome('body', 'Physical Bloodline Potential', '体', 'Your strengths point toward unusual physiology, durability, mobility, or body-based techniques.'),
    outcome('chakra', 'Chakra Gift', '脈', 'Your profile suggests exceptional reserves, control, recovery, or an unusual relationship with chakra itself.'),
    outcome('sensory', 'Sensory Gift', '感', 'Awareness, detection, intuition, and reading subtle information are central to your potential.'),
    outcome('elemental', 'Elemental Bloodline Potential', '遁', 'Your profile favors unusually deep elemental affinity or the possibility of a combined nature.'),
    outcome('none', 'Training-Built Talent', '鍛', 'Your strongest path is not an inherited shortcut but mastery built through discipline, creativity, and repetition.'),
  ],
  [
    question('inherited-1', 'Instinct', 'Which unusual advantage would feel most natural to discover you had?', [
      answer('I can notice visual details and movements other people miss.', { dojutsu: 5, sensory: 1 }),
      answer('My body handles strain, impact, or movement in an unusual way.', { body: 5 }),
      answer('My chakra feels deeper or easier to control than expected.', { chakra: 5 }),
      answer('I can sense people or changes without needing to see them directly.', { sensory: 5 }),
    ]),
    question('inherited-2', 'Training', 'Which ability would change your training most?', [
      answer('Enhanced perception that lets me study and react to technique more precisely.', { dojutsu: 5 }),
      answer('A body that supports techniques most people could not physically sustain.', { body: 5 }),
      answer('Enough control or reserves to practice chakra-intensive skills longer.', { chakra: 5 }),
      answer('An elemental affinity strong enough to reshape my entire fighting style.', { elemental: 5 }),
    ]),
    question('inherited-3', 'Information', 'What kind of hidden information would you most want access to?', [
      answer('Tiny changes in movement, expression, and visual patterns.', { dojutsu: 5 }),
      answer('The exact condition and limits of my own body.', { body: 4, chakra: 1 }),
      answer('The flow and quality of chakra around me.', { chakra: 4, sensory: 2 }),
      answer('Presence, distance, direction, or intent beyond normal senses.', { sensory: 5 }),
    ]),
    question('inherited-4', 'Power', 'Which kind of rare power interests you least?', [
      answer('Anything that only works because I was born with special eyes.', { none: 4, body: 1 }),
      answer('Anything that depends on changing my body in extreme ways.', { none: 4, chakra: 1 }),
      answer('Anything that mostly increases raw chakra without improving skill.', { none: 4, elemental: 1 }),
      answer('None of those bother me if the ability creates a unique tactical advantage.', { dojutsu: 2, body: 2, chakra: 2, sensory: 2, elemental: 2 }),
    ]),
    question('inherited-5', 'Element', 'How do elemental techniques feel to you conceptually?', [
      answer('Useful, but perception and timing matter more than the element itself.', { dojutsu: 4, sensory: 2 }),
      answer('Most interesting when the element physically changes how I can move or fight.', { body: 4, elemental: 2 }),
      answer('A natural expression of chakra control.', { chakra: 4, elemental: 2 }),
      answer('Potentially the core of my identity if I had an unusually deep affinity.', { elemental: 5 }),
    ]),
    question('inherited-6', 'Reliance', 'Would you want your rare trait to define your entire identity?', [
      answer('Yes, if it creates a completely different way of seeing a fight.', { dojutsu: 5 }),
      answer('Yes, if it changes what my body can physically do.', { body: 5 }),
      answer('Only if it deepens techniques I already value instead of replacing them.', { chakra: 4, elemental: 2 }),
      answer('No. I would rather be known for what I built through training.', { none: 5 }),
    ]),
    question('inherited-7', 'Awareness', 'Which situation would you most want a hidden advantage in?', [
      answer('Reading an opponent’s next movement.', { dojutsu: 5 }),
      answer('Surviving physical conditions others cannot.', { body: 5 }),
      answer('Detecting threats before the rest of the squad notices them.', { sensory: 5 }),
      answer('Using two elemental properties together in a way others cannot easily copy.', { elemental: 5 }),
    ]),
    question('inherited-8', 'Growth', 'How should an inherited gift grow?', [
      answer('Through sharper interpretation and increasingly advanced perception.', { dojutsu: 5 }),
      answer('Through conditioning and learning the limits of the body.', { body: 5 }),
      answer('Through better efficiency, control, and chakra capacity.', { chakra: 5 }),
      answer('It should matter less than disciplined training as I become stronger.', { none: 5 }),
    ]),
    question('inherited-9', 'Support', 'Which rare trait would help a squad most?', [
      answer('Seeing threats and patterns nobody else catches.', { dojutsu: 4, sensory: 2 }),
      answer('Being able to physically perform roles others cannot.', { body: 5 }),
      answer('Having the reserves and control to sustain difficult techniques.', { chakra: 5 }),
      answer('Detecting distant or concealed threats before contact.', { sensory: 5 }),
    ]),
    question('inherited-10', 'Legacy', 'Which legacy sounds most appealing?', [
      answer('A perception ability with a distinct original visual signature.', { dojutsu: 5 }),
      answer('A physical trait that creates techniques unique to the bloodline.', { body: 5 }),
      answer('An elemental gift that produces a rare nature or combination.', { elemental: 5, chakra: 1 }),
      answer('A reputation proving exceptional shinobi do not need an inherited advantage.', { none: 5 }),
    ]),
  ],
);

export const specialtyTest = makeTest(
  'specialty',
  'Shinobi Specialty',
  'Specialty',
  '✣',
  'Identify the discipline where your talents would become most valuable.',
  [
    outcome('tracker', 'Tracker', '跡', 'You excel at pursuit, trails, patterns, and turning tiny clues into direction.'),
    outcome('medic', 'Medical Specialist', '医', 'You are drawn to precision, recovery, support, and keeping a team functional under pressure.'),
    outcome('sensor', 'Sensor', '感', 'Your value comes from awareness, detection, early warning, and information the rest of the squad cannot easily access.'),
    outcome('infiltrator', 'Infiltrator', '潜', 'You favor subtle movement, disguise, access, misdirection, and solving objectives without unnecessary confrontation.'),
    outcome('duelist', 'Duelist', '決', 'You are strongest when a difficult individual threat must be understood and neutralized directly.'),
    outcome('barrier', 'Barrier & Sealing Specialist', '封', 'You prefer preparation, containment, protection, and techniques that define rules for the encounter.'),
    outcome('tactician', 'Tactician', '策', 'Your greatest contribution is connecting information, people, timing, and resources into a better plan.'),
  ],
  [
    question('specialty-1', 'Mission', 'Which assignment would you choose first?', [
      answer('Find someone who disappeared with almost no trail left behind.', { tracker: 5, sensor: 1 }),
      answer('Keep a squad operational during a long dangerous mission.', { medic: 5 }),
      answer('Locate hidden threats before the team enters the area.', { sensor: 5 }),
      answer('Enter a protected location, get what is needed, and leave unnoticed.', { infiltrator: 5 }),
    ]),
    question('specialty-2', 'Problem', 'Which difficult problem sounds most satisfying to solve?', [
      answer('Reconstructing where someone went from small environmental clues.', { tracker: 5 }),
      answer('Stabilizing someone when there is almost no time to think.', { medic: 5 }),
      answer('Containing something dangerous with a prepared technique or seal.', { barrier: 5 }),
      answer('Building the plan that makes several specialists work as one unit.', { tactician: 5 }),
    ]),
    question('specialty-3', 'Focus', 'Where does your attention naturally go?', [
      answer('Tracks, patterns, changes in terrain, and where people have been.', { tracker: 5 }),
      answer('The condition and capabilities of the people around me.', { medic: 5 }),
      answer('Signals that reveal something hidden or approaching.', { sensor: 5 }),
      answer('The most dangerous individual on the field.', { duelist: 5 }),
    ]),
    question('specialty-4', 'Preparation', 'You have an hour before a difficult mission. What do you prepare?', [
      answer('Routes, likely trails, and ways to avoid losing the target.', { tracker: 5 }),
      answer('Medical supplies, recovery options, and contingency care.', { medic: 5 }),
      answer('Entry identities, cover story, access points, and exit routes.', { infiltrator: 5 }),
      answer('Maps, roles, contingencies, timing, and communication rules.', { tactician: 5 }),
    ]),
    question('specialty-5', 'Conflict', 'If a direct confrontation becomes unavoidable, what role fits you best?', [
      answer('Keep track of movement so nobody escapes or flanks the squad.', { tracker: 4, sensor: 2 }),
      answer('Keep allies functioning while reducing preventable losses.', { medic: 5 }),
      answer('Take responsibility for the strongest individual threat.', { duelist: 5 }),
      answer('Control space with barriers, traps, or containment.', { barrier: 5 }),
    ]),
    question('specialty-6', 'Success', 'Which success would make you proudest?', [
      answer('Finding a target everyone else believed was impossible to locate.', { tracker: 5 }),
      answer('Bringing everyone home from a mission that should have gone much worse.', { medic: 5 }),
      answer('Completing the objective without the opposition ever understanding how.', { infiltrator: 5 }),
      answer('Designing a plan where every teammate’s strength matters.', { tactician: 5 }),
    ]),
    question('specialty-7', 'Knowledge', 'What type of knowledge would you study deepest?', [
      answer('Behavior, trails, terrain, and pursuit.', { tracker: 5 }),
      answer('Anatomy, chakra pathways, recovery, and precision control.', { medic: 5 }),
      answer('Detection ranges, signatures, concealment, and information networks.', { sensor: 5 }),
      answer('Seals, barriers, containment rules, and prepared formations.', { barrier: 5 }),
    ]),
    question('specialty-8', 'Independence', 'Which specialty would you trust yourself to perform alone?', [
      answer('Follow a difficult target over a long distance.', { tracker: 5 }),
      answer('Blend into an unfamiliar environment and quietly complete an objective.', { infiltrator: 5 }),
      answer('Handle a dangerous opponent one-on-one.', { duelist: 5 }),
      answer('Analyze a complicated situation and build the most efficient response.', { tactician: 5 }),
    ]),
    question('specialty-9', 'Pressure', 'What happens to you when the mission becomes chaotic?', [
      answer('I start looking for the trail or pattern that still makes sense.', { tracker: 4, sensor: 2 }),
      answer('I prioritize whoever is most at risk and stabilize the situation.', { medic: 5 }),
      answer('I reduce my visibility and look for a quiet route to the objective.', { infiltrator: 5 }),
      answer('I simplify the situation into priorities, roles, and timing.', { tactician: 5 }),
    ]),
    question('specialty-10', 'Elite', 'What would make you elite in your field?', [
      answer('I can find almost anyone from almost nothing.', { tracker: 5 }),
      answer('I can keep people alive and effective under extreme pressure.', { medic: 5 }),
      answer('I can identify threats before anyone else knows they exist.', { sensor: 5 }),
      answer('I can either neutralize the key opponent or contain the entire encounter depending on what is needed.', { duelist: 3, barrier: 3, tactician: 1 }),
    ]),
  ],
);

export const teamRoleTest = makeTest(
  'teamRole',
  'Team Role',
  'Team Role',
  '◫',
  'Find the role you naturally fill inside a shinobi squad.',
  [
    outcome('assault', 'Vanguard', '攻', 'You create momentum by applying pressure and breaking through the point holding the squad back.'),
    outcome('recon', 'Recon', '偵', 'You create safety through information, scouting, tracking, and reducing surprises before the team commits.'),
    outcome('support', 'Support', '援', 'You amplify everyone else through recovery, utility, coordination, and creating openings.'),
    outcome('defense', 'Defender', '守', 'You stabilize the squad by absorbing pressure, protecting key people, and preventing collapse.'),
    outcome('control', 'Controller', '制', 'You shape positioning, tempo, terrain, and enemy choices so the squad fights on favorable terms.'),
    outcome('wildcard', 'Wildcard', '変', 'You are most valuable when roles break down and someone needs to become whatever the mission suddenly requires.'),
  ],
  [
    question('role-1', 'Start', 'Your squad reaches an unknown objective area. Where do you naturally contribute first?', [
      answer('Take the lead position and be ready to create an opening.', { assault: 5 }),
      answer('Scout routes, threats, and exits before the team commits.', { recon: 5 }),
      answer('Check what everyone needs and prepare utility around the plan.', { support: 5 }),
      answer('Choose a position that protects the team if contact goes badly.', { defense: 5 }),
    ]),
    question('role-2', 'Pressure', 'The squad is losing momentum. What do you do?', [
      answer('Increase pressure and force something to change.', { assault: 5 }),
      answer('Find the information we are missing before anyone commits harder.', { recon: 5 }),
      answer('Create an opening or recovery window for the person best positioned to act.', { support: 5 }),
      answer('Change the spacing or terrain so the opposition cannot keep dictating the encounter.', { control: 5 }),
    ]),
    question('role-3', 'Failure', 'A teammate can no longer perform their assigned role. Your instinct?', [
      answer('Keep driving the objective so the team does not stall.', { assault: 4, wildcard: 2 }),
      answer('Update the team with what the change means for threats and routes.', { recon: 5 }),
      answer('Take care of the teammate and help redistribute their workload.', { support: 5 }),
      answer('Fill the missing role myself until the squad can reorganize.', { wildcard: 5 }),
    ]),
    question('role-4', 'Value', 'What does a strong team need most from you?', [
      answer('Someone willing to commit first when hesitation becomes costly.', { assault: 5 }),
      answer('Reliable information before important decisions.', { recon: 5 }),
      answer('Consistency that keeps people effective over the whole mission.', { support: 5 }),
      answer('A stable anchor that prevents one bad moment from becoming a collapse.', { defense: 5 }),
    ]),
    question('role-5', 'Position', 'Where would you rather be during a complicated encounter?', [
      answer('At the point where the main resistance has to break.', { assault: 5 }),
      answer('At an angle where I can see what the rest of the team cannot.', { recon: 5 }),
      answer('Near enough to reach whoever needs help next.', { support: 5 }),
      answer('At the position that controls the most important routes and space.', { control: 5 }),
    ]),
    question('role-6', 'Protection', 'A high-value teammate becomes the focus of the opposition. What do you do?', [
      answer('Pressure the opponent hard enough that they cannot stay focused on the target.', { assault: 5 }),
      answer('Identify who is coordinating the pressure and how they are getting information.', { recon: 5 }),
      answer('Keep the teammate functional and create options for escape or recovery.', { support: 5 }),
      answer('Put myself between the threat and the teammate and hold the position.', { defense: 5 }),
    ]),
    question('role-7', 'Planning', 'Which part of planning interests you most?', [
      answer('Where and when the team should commit force.', { assault: 4, control: 1 }),
      answer('What we need to know before the mission begins.', { recon: 5 }),
      answer('What resources and contingencies keep the team effective.', { support: 5 }),
      answer('How to shape routes, spacing, traps, and fallback positions.', { control: 5, defense: 1 }),
    ]),
    question('role-8', 'Chaos', 'Everything changes at once. What happens to your role?', [
      answer('I keep a clear direction and create forward momentum.', { assault: 4, defense: 1 }),
      answer('I search for the new piece of information that explains the change.', { recon: 5 }),
      answer('I stabilize whoever is becoming the weakest link.', { support: 5, defense: 1 }),
      answer('I become whatever role is suddenly missing.', { wildcard: 5 }),
    ]),
    question('role-9', 'Reputation', 'Which squad reputation sounds best?', [
      answer('The one who breaks stalemates.', { assault: 5 }),
      answer('The one who rarely gets surprised.', { recon: 5 }),
      answer('The one everyone performs better beside.', { support: 5 }),
      answer('The one who makes the entire field easier for the team to manage.', { control: 5 }),
    ]),
    question('role-10', 'Peak', 'At your best, what does your team notice?', [
      answer('I create the moment everyone else can capitalize on.', { assault: 5 }),
      answer('I saw the problem before it reached them.', { recon: 5 }),
      answer('I kept the mission from falling apart when pressure hit.', { defense: 4, support: 2 }),
      answer('I smoothly changed roles every time the mission demanded something different.', { wildcard: 5, control: 1 }),
    ]),
  ],
);
