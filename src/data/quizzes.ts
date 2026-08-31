import type { Answer, Outcome, Question, TestDefinition, TestId } from '../types';
import { clans } from './clans';

const answer = (text: string, scores: Record<string, number>): Answer => ({ text, scores });
const outcome = (id: string, symbol: string, description: string, extra: Partial<Outcome> = {}): Outcome => ({ id, label: id, symbol, description, ...extra });

// ===== CLAN QUIZ =====
const questions:Question[]=[
{id:'clan-1',theme:'Pressure',prompt:'Your squad leader freezes during an ambush. What do you do?',answers:[answer('Take command and give everyone a clear job.',{Senju:4,Sarutobi:3,Kazekage:2}),answer('Get everyone behind cover and calculate the safest counter.',{Nara:4,Aburame:3,Hyuga:2}),answer('Protect the most vulnerable teammate first.',{Akimichi:4,Uzumaki:3,Yuki:2}),answer('Charge the threat before it gains momentum.',{Inuzuka:4,Kaguya:3,Uchiha:2}),answer('Break away and find an angle nobody is watching.',{Hozuki:3,Aburame:3,Otsutsuki:2})]},
{id:'clan-2',theme:'Trust',prompt:'A close friend betrays your confidence. Your first response?',answers:[answer('Understand why before deciding what happens next.',{Yamanaka:4,Senju:2}),answer('Cut them off. Trust is difficult to rebuild.',{Uchiha:4,Hyuga:2}),answer('Confront them immediately.',{Inuzuka:4,Kaguya:2}),answer('Say little while figuring out their motive.',{Aburame:4,Nara:3}),answer('Forgive them if the remorse is real.',{Uzumaki:4,Akimichi:3,Yuki:2})]},
{id:'clan-3',theme:'Training',prompt:'You suddenly have one free month to train. What sounds best?',answers:[answer('Perfect one technique until it feels effortless.',{Hyuga:4,Uchiha:3}),answer('Study many techniques and become more versatile.',{Sarutobi:4,Senju:3}),answer('Train your body until your limits move.',{Kaguya:3,Inuzuka:3,Jugo:3}),answer('Study tactics, psychology, and previous battles.',{Nara:4,Yamanaka:3,Aburame:2}),answer('Experiment with something nobody has taught you.',{Otsutsuki:3,Hozuki:3,Uzumaki:2})]},
{id:'clan-4',theme:'Leadership',prompt:'Which leader earns your loyalty fastest?',answers:[answer('The one who is visibly stronger than everyone else.',{Kaguya:3,Uchiha:3,Kazekage:2}),answer('The one who understands every member of the team.',{Yamanaka:4,Senju:3}),answer('The one whose plans consistently work.',{Nara:4,Aburame:3}),answer('The one who would never abandon a teammate.',{Uzumaki:4,Akimichi:4}),answer('The one who gives me freedom and trusts my judgment.',{Hozuki:3,Inuzuka:2,Otsutsuki:2})]},
{id:'clan-5',theme:'Conflict',prompt:'An enemy is much stronger than expected. You…',answers:[answer('Keep testing defenses until you find a weakness.',{Uchiha:3,Hyuga:3,Aburame:2}),answer('Create space and redesign the entire fight.',{Nara:4,Kazekage:3}),answer('Outlast them.',{Uzumaki:4,Senju:3,Jugo:2}),answer('Become more aggressive—the pressure might break them.',{Kaguya:4,Inuzuka:3}),answer('Escape now and choose a better battlefield later.',{Hozuki:4,Yuki:2,Aburame:2})]},
{id:'clan-6',theme:'Legacy',prompt:'What matters most when people remember you?',answers:[answer('That I changed things.',{Otsutsuki:3,Uchiha:3,Kazekage:2}),answer('That I protected my people.',{Senju:4,Uzumaki:3,Akimichi:3}),answer('That I was brilliant at what I did.',{Nara:4,Hyuga:3,Aburame:2}),answer('That I lived fully and fearlessly.',{Inuzuka:3,Kaguya:3,Jugo:2}),answer('That I understood people.',{Yamanaka:4,Yuki:3})]},
{id:'clan-7',theme:'Unknown',prompt:'You find a forbidden scroll with no owner. You…',answers:[answer('Study it carefully before making any decision.',{Nara:3,Aburame:3,Hyuga:2}),answer('Turn it in. Some rules exist for a reason.',{Sarutobi:4,Senju:3}),answer('Learn just enough to know whether it is dangerous.',{Yamanaka:3,Yuki:2,Hozuki:2}),answer('Use it if it can make me stronger.',{Uchiha:3,Kaguya:2,Otsutsuki:4}),answer('Hide it until I understand who wants it.',{Hozuki:3,Aburame:2,Kazekage:2})]},
{id:'clan-8',theme:'Teamwork',prompt:'Which role feels most natural in a four-person squad?',answers:[answer('Planner and coordinator.',{Nara:4,Yamanaka:3}),answer('Front-line protector.',{Akimichi:4,Senju:3,Uzumaki:2}),answer('Scout and tracker.',{Aburame:4,Inuzuka:4}),answer('Precision finisher.',{Uchiha:4,Hyuga:3,Kaguya:2}),answer('Wildcard who adapts to whatever happens.',{Hozuki:4,Sarutobi:3,Jugo:2})]},
{id:'clan-9',theme:'Rules',prompt:'A village rule blocks the fastest solution to an urgent problem. You…',answers:[answer('Work within the rule and find a smarter solution.',{Nara:4,Hyuga:2,Sarutobi:2}),answer('Break it if protecting someone clearly matters more.',{Uzumaki:4,Senju:3,Inuzuka:2}),answer('Ask who benefits from the rule before deciding.',{Yamanaka:3,Aburame:3,Kazekage:2}),answer('Ignore it. Results are what matter.',{Uchiha:3,Kaguya:3,Otsutsuki:2}),answer('Find a technical loophole nobody considered.',{Hozuki:4,Sarutobi:2})]},
{id:'clan-10',theme:'Loss',prompt:'A major setback destroys months of work. What happens next?',answers:[answer('I rebuild methodically from what the failure taught me.',{Hyuga:3,Aburame:3,Nara:3}),answer('I get angry, then use that energy to come back stronger.',{Uchiha:4,Inuzuka:2}),answer('I focus on keeping everyone else from giving up.',{Uzumaki:4,Akimichi:3,Senju:2}),answer('I abandon the old approach and reinvent the plan.',{Hozuki:3,Sarutobi:3,Otsutsuki:2}),answer('I become relentless until the setback stops mattering.',{Kaguya:3,Jugo:3,Kazekage:2})]},
{id:'clan-11',theme:'Recognition',prompt:'You accomplish something difficult but someone else receives the credit. What bothers you most?',answers:[answer('That the truth was ignored.',{Hyuga:3,Uchiha:3}),answer('Nothing if the mission succeeded.',{Senju:4,Sarutobi:3}),answer('That the team dynamic is now dishonest.',{Yamanaka:4,Akimichi:2}),answer('I remember it and make sure it cannot happen twice.',{Kazekage:3,Aburame:3,Nara:2}),answer('I prove myself again, louder.',{Inuzuka:4,Kaguya:2})]},
{id:'clan-12',theme:'Mentorship',prompt:'A talented younger shinobi keeps making reckless mistakes. How do you teach them?',answers:[answer('Give them structure and make them repeat fundamentals.',{Hyuga:4,Sarutobi:3}),answer('Let them fail safely enough to understand consequences.',{Nara:3,Aburame:2,Senju:2}),answer('Train beside them until they believe they can improve.',{Uzumaki:4,Akimichi:3}),answer('Challenge them directly and force them to rise.',{Uchiha:3,Inuzuka:3,Kaguya:2}),answer('Figure out what emotion is driving the recklessness first.',{Yamanaka:4,Yuki:3})]},
{id:'clan-13',theme:'Information',prompt:'You know something dangerous that could panic the village if revealed. What do you do?',answers:[answer('Tell leadership privately and prepare a response.',{Kazekage:4,Nara:3}),answer('Tell the people closest to the danger first.',{Senju:3,Uzumaki:3}),answer('Verify every detail before speaking.',{Aburame:4,Hyuga:3}),answer('Keep it secret until I can personally act on it.',{Uchiha:3,Hozuki:3}),answer('Share it openly. People deserve the truth.',{Inuzuka:3,Yamanaka:2})]},
{id:'clan-14',theme:'Competition',prompt:'Someone your age is clearly ahead of you. Your instinct?',answers:[answer('Study exactly what they do better.',{Hyuga:3,Nara:3,Aburame:2}),answer('Train harder until the gap disappears.',{Uchiha:4,Kaguya:3}),answer('Ask them to train with me.',{Uzumaki:3,Akimichi:2,Senju:2}),answer('Find a completely different strength they cannot match.',{Hozuki:3,Sarutobi:3,Otsutsuki:2}),answer('Enjoy the competition—it makes everything more fun.',{Inuzuka:4,Jugo:2})]},
{id:'clan-15',theme:'Sacrifice',prompt:'A mission can succeed only if one person stays behind to hold a position. You…',answers:[answer('Volunteer if I am the best fit.',{Senju:4,Uzumaki:3,Akimichi:3}),answer('Find another plan. I reject the premise.',{Nara:4,Sarutobi:3}),answer('Choose based on probability, not emotion.',{Aburame:4,Kazekage:3}),answer('Stay if it gives everyone else the cleanest path to victory.',{Uchiha:3,Hyuga:3}),answer('Turn it into a trap and make the enemy regret following.',{Hozuki:3,Kaguya:3})]},
{id:'clan-16',theme:'Authority',prompt:'A respected superior gives an order you believe is morally wrong. What wins?',answers:[answer('My own judgment.',{Uchiha:3,Uzumaki:3,Inuzuka:2}),answer('The chain of command unless I have proof.',{Hyuga:3,Sarutobi:3}),answer('Protecting people from harm.',{Senju:4,Akimichi:3,Yuki:2}),answer('The long-term consequences.',{Nara:4,Kazekage:3,Aburame:2}),answer('I obey publicly and undermine it quietly.',{Hozuki:4,Yamanaka:2})]},
{id:'clan-17',theme:'Environment',prompt:'You must fight in unfamiliar terrain. What do you establish first?',answers:[answer('Sightlines and weak points.',{Hyuga:4,Uchiha:2}),answer('Escape routes and fallback positions.',{Nara:3,Aburame:3,Hozuki:2}),answer('Where my teammates are safest.',{Senju:3,Akimichi:3}),answer('Where I can build momentum.',{Inuzuka:3,Kaguya:3,Jugo:2}),answer('How the terrain itself can become a weapon.',{Kazekage:4,Sarutobi:2})]},
{id:'clan-18',theme:'Emotion',prompt:'When you are furious, what usually happens?',answers:[answer('I get quieter and more focused.',{Uchiha:3,Hyuga:3}),answer('I need movement or action immediately.',{Inuzuka:4,Jugo:3,Kaguya:2}),answer('I vent to someone I trust.',{Uzumaki:3,Akimichi:3,Yamanaka:2}),answer('I detach and analyze what caused it.',{Nara:4,Aburame:3}),answer('I redirect it into something useful.',{Senju:3,Sarutobi:3,Kazekage:2})]},
{id:'clan-19',theme:'Strategy',prompt:'Which kind of victory feels most satisfying?',answers:[answer('Winning before the opponent understands the plan.',{Nara:4,Aburame:3}),answer('Breaking through their strongest defense.',{Uchiha:4,Kaguya:3}),answer('Winning while everyone on my side makes it home.',{Senju:4,Uzumaki:3,Akimichi:2}),answer('Turning their own strength against them.',{Hozuki:4,Yamanaka:2}),answer('A clean technical victory with almost no wasted motion.',{Hyuga:4,Kazekage:2})]},
{id:'clan-20',theme:'Community',prompt:'Your village has limited resources after a disaster. Where do you help first?',answers:[answer('Organize distribution so nothing is wasted.',{Nara:3,Kazekage:4}),answer('Work directly with injured families.',{Senju:3,Akimichi:4,Yuki:2}),answer('Restore communications and information flow.',{Yamanaka:4,Aburame:2}),answer('Secure the perimeter from opportunistic threats.',{Uchiha:3,Hyuga:3}),answer('Take whatever job nobody else wants.',{Uzumaki:4,Sarutobi:2})]},
{id:'clan-21',theme:'Independence',prompt:'You are offered a powerful technique that requires following a rigid tradition. Your reaction?',answers:[answer('Tradition is fine if the technique works.',{Hyuga:4,Sarutobi:2}),answer('I want to understand the tradition before accepting it.',{Nara:3,Yamanaka:2}),answer('I would rather adapt it into my own style.',{Hozuki:4,Uchiha:2,Otsutsuki:2}),answer('I care more about who teaches me than the rules around it.',{Uzumaki:3,Akimichi:2}),answer('Give me the hardest version immediately.',{Kaguya:3,Inuzuka:3,Jugo:2})]},
{id:'clan-22',theme:'Fear',prompt:'What kind of threat unsettles you most?',answers:[answer('One I cannot understand.',{Nara:3,Aburame:3}),answer('One that targets people I love.',{Uzumaki:4,Akimichi:3}),answer('One that makes me powerless.',{Uchiha:4,Kaguya:2}),answer('One that turns allies against each other.',{Yamanaka:4,Senju:2}),answer('One I cannot physically escape.',{Hozuki:3,Inuzuka:2})]},
{id:'clan-23',theme:'Reputation',prompt:'People underestimate you. How do you handle it?',answers:[answer('Let them. It gives me an advantage.',{Aburame:4,Nara:3,Hozuki:2}),answer('Correct them with results.',{Hyuga:3,Uchiha:3}),answer('Use humor and keep moving.',{Sarutobi:2,Hozuki:3}),answer('Take it personally and prove them wrong.',{Inuzuka:4,Kaguya:2}),answer('I care more about what my people know about me.',{Akimichi:3,Uzumaki:3,Senju:2})]},
{id:'clan-24',theme:'Preparation',prompt:'You have one hour before an unknown high-risk mission. What do you spend it on?',answers:[answer('Gathering intelligence.',{Aburame:4,Nara:4}),answer('Checking equipment and drilling fundamentals.',{Hyuga:3,Kazekage:3}),answer('Talking through everyone’s role.',{Yamanaka:4,Senju:3}),answer('Training intensely to sharpen my edge.',{Uchiha:3,Kaguya:3}),answer('Resting and trusting my instincts.',{Inuzuka:3,Hozuki:3})]},
{id:'clan-25',theme:'Change',prompt:'Your village is changing fast. What do you protect from being lost?',answers:[answer('Its people and bonds.',{Senju:4,Uzumaki:3,Akimichi:2}),answer('Its standards and discipline.',{Hyuga:4,Kazekage:2}),answer('Its knowledge and techniques.',{Sarutobi:3,Aburame:3}),answer('Nothing automatically—change may be necessary.',{Hozuki:3,Otsutsuki:3}),answer('The lessons earned through suffering.',{Uchiha:3,Yuki:2})]},
{id:'clan-26',theme:'Power',prompt:'You gain a rare ability nobody around you understands. What comes first?',answers:[answer('Master it privately before anyone can judge it.',{Uchiha:4,Otsutsuki:3}),answer('Document exactly how it works.',{Aburame:4,Hyuga:2}),answer('Find someone I trust and train safely.',{Senju:3,Uzumaki:3}),answer('Test its limits immediately.',{Kaguya:3,Jugo:3,Inuzuka:2}),answer('Explore unconventional uses other people would miss.',{Hozuki:4,Sarutobi:2})]},
{id:'clan-27',theme:'Diplomacy',prompt:'Two allies are about to turn on each other. What is your move?',answers:[answer('Get both sides talking before pride takes over.',{Yamanaka:4,Senju:3}),answer('Identify the practical dispute and solve that.',{Nara:4,Kazekage:3}),answer('Remind them what they stand to lose together.',{Uzumaki:3,Akimichi:3}),answer('Make it clear neither side will benefit from escalating.',{Uchiha:3,Hyuga:2}),answer('Separate them until emotions cool down.',{Aburame:3,Yuki:3})]},
{id:'clan-28',theme:'Instinct',prompt:'A stranger challenges you in front of everyone. What is your first internal reaction?',answers:[answer('Why are they doing this?',{Yamanaka:3,Nara:3}),answer('Fine. Let’s settle it.',{Inuzuka:4,Kaguya:3}),answer('They probably want a reaction. I will not give them one.',{Aburame:4,Hyuga:3}),answer('I feel the anger, but I choose when to act.',{Uchiha:4,Kazekage:2}),answer('I try to defuse it unless someone is actually threatened.',{Senju:3,Uzumaki:3})]},
{id:'clan-29',theme:'Specialization',prompt:'If you could be elite at only one shinobi skill, which would you choose?',answers:[answer('Battlefield strategy.',{Nara:5,Kazekage:2}),answer('Precision combat.',{Hyuga:4,Uchiha:3}),answer('Tracking and pursuit.',{Inuzuka:4,Aburame:4}),answer('Protection and endurance.',{Akimichi:4,Uzumaki:3,Senju:2}),answer('Adaptation and unconventional techniques.',{Hozuki:4,Sarutobi:3,Otsutsuki:2})]},
{id:'clan-30',theme:'Core',prompt:'At your best, what do you think drives you most?',answers:[answer('Mastery.',{Uchiha:3,Hyuga:3,Otsutsuki:2}),answer('Responsibility.',{Senju:4,Sarutobi:3,Kazekage:2}),answer('Connection.',{Uzumaki:4,Akimichi:3,Yamanaka:3}),answer('Understanding.',{Nara:4,Aburame:3,Yuki:2}),answer('Freedom.',{Inuzuka:3,Hozuki:3,Jugo:2})]}
];

export const clanTest:TestDefinition={id:'clan',label:'Clan Sorter',shortLabel:'Clan',icon:'忍',description:'A bloodline personality assessment built from distinct scenarios rather than repeated variants.',questionCount:30,lengths:{short:10,medium:20,long:30},questions,outcomes:clans};

// ===== VILLAGE QUIZ =====
const ids=['Konohagakure','Sunagakure','Kumogakure','Iwagakure','Kirigakure'];
export const villageTest:TestDefinition={id:'village',label:'Village Affinity',shortLabel:'Village',icon:'里',description:'Find the hidden village whose values, pressure response, and culture fit you best.',questionCount:10,lengths:{short:5,medium:8,long:10},outcomes:{
Konohagakure:outcome('Konohagakure','葉','You thrive where bonds, growth, and versatility matter.'),Sunagakure:outcome('Sunagakure','砂','You favor self-reliance, composure, and strategic control.'),Kumogakure:outcome('Kumogakure','雷','You respect confidence, directness, and strength in motion.'),Iwagakure:outcome('Iwagakure','岩','You value endurance, discipline, and standing your ground.'),Kirigakure:outcome('Kirigakure','霧','You adapt quickly, keep your edge hidden, and survive changing conditions.')},questions:[
{id:'v1',theme:'Culture',prompt:'Which village philosophy would make you want to stay?',answers:[answer('People become strongest through the bonds they choose.',{Konohagakure:5}),answer('Survival rewards restraint, planning, and self-control.',{Sunagakure:5}),answer('Confidence should be visible in the way you act.',{Kumogakure:5}),answer('Persistence matters more than flash.',{Iwagakure:5}),answer('Adaptability is more valuable than predictability.',{Kirigakure:5})]},
{id:'v2',theme:'Terrain',prompt:'Where would you rather spend a year training?',answers:[answer('Dense forest with endless routes and team exercises.',{Konohagakure:5}),answer('Open desert where every resource matters.',{Sunagakure:5}),answer('Mountain ridges under violent storms.',{Kumogakure:5}),answer('Stone canyons and high plateaus.',{Iwagakure:5}),answer('Cold coastlines covered in heavy mist.',{Kirigakure:5})]},
{id:'v3',theme:'Leadership',prompt:'What should a village leader be best at?',answers:[answer('Building trust across very different people.',{Konohagakure:5}),answer('Keeping the village secure with limited resources.',{Sunagakure:5}),answer('Projecting strength so enemies hesitate.',{Kumogakure:5}),answer('Holding firm when everyone else bends.',{Iwagakure:5}),answer('Knowing when to conceal intent and when to strike.',{Kirigakure:5})]},
{id:'v4',theme:'Pressure',prompt:'Your home is threatened. Which response feels most natural?',answers:[answer('Coordinate everyone and protect civilians first.',{Konohagakure:5}),answer('Turn the terrain into an advantage before engaging.',{Sunagakure:5}),answer('Meet the threat aggressively before it settles in.',{Kumogakure:5}),answer('Fortify, endure, and make them pay for every step.',{Iwagakure:5}),answer('Disorient them and attack from angles they cannot read.',{Kirigakure:5})]},
{id:'v5',theme:'Reputation',prompt:'What reputation would you rather your village have?',answers:[answer('The place with the strongest next generation.',{Konohagakure:5}),answer('The village nobody underestimates twice.',{Sunagakure:5}),answer('The village with overwhelming elite fighters.',{Kumogakure:5}),answer('The village that cannot be broken.',{Iwagakure:5}),answer('The village whose shinobi are impossible to predict.',{Kirigakure:5})]},
{id:'v6',theme:'Mission',prompt:'Which mission sounds most appealing?',answers:[answer('Protecting a diplomatic summit.',{Konohagakure:4,Sunagakure:1}),answer('Guarding a caravan through hostile desert.',{Sunagakure:5}),answer('Intercepting an enemy strike team head-on.',{Kumogakure:5}),answer('Defending a mountain pass for three days.',{Iwagakure:5}),answer('Silent infiltration through enemy waterways.',{Kirigakure:5})]},
{id:'v7',theme:'Growth',prompt:'How should young shinobi be developed?',answers:[answer('Teams, mentors, and broad exposure.',{Konohagakure:5}),answer('Responsibility early, with consequences that feel real.',{Sunagakure:5}),answer('Hard competition that exposes weakness fast.',{Kumogakure:5}),answer('Repetition until fundamentals cannot fail.',{Iwagakure:5}),answer('Unpredictable trials that force adaptation.',{Kirigakure:5})]},
{id:'v8',theme:'Identity',prompt:'What trait do you most want associated with your home?',answers:[answer('Loyalty',{Konohagakure:5}),answer('Composure',{Sunagakure:5}),answer('Power',{Kumogakure:5}),answer('Resolve',{Iwagakure:5}),answer('Mystique',{Kirigakure:5})]},
{id:'v9',theme:'Alliance',prompt:'In an alliance, what do you bring first?',answers:[answer('Relationship-building and coordination.',{Konohagakure:5}),answer('Resource awareness and tactical planning.',{Sunagakure:5}),answer('Deterrence and rapid force.',{Kumogakure:5}),answer('Reliable defense and staying power.',{Iwagakure:5}),answer('Intelligence, stealth, and flexibility.',{Kirigakure:5})]},
{id:'v10',theme:'Instinct',prompt:'Pick the word that feels most like home.',answers:[answer('Belonging',{Konohagakure:5}),answer('Focus',{Sunagakure:5}),answer('Momentum',{Kumogakure:5}),answer('Foundation',{Iwagakure:5}),answer('Depth',{Kirigakure:5})]}
]};

// ===== MENTOR QUIZ =====
export const mentorTest:TestDefinition={id:'mentor',label:'Sensei Match',shortLabel:'Sensei',icon:'師',description:'Find the mentor whose teaching style would produce your best growth.',questionCount:10,lengths:{short:5,medium:8,long:10},outcomes:{Kakashi:outcome('Kakashi','雷','You learn best from calm expertise, independence, and lessons hidden inside experience.'),'Might Guy':outcome('Might Guy','炎','You respond to relentless encouragement, visible effort, and physical challenge.'),Tsunade:outcome('Tsunade','医','You need demanding standards, practical competence, and someone who refuses excuses.'),Jiraiya:outcome('Jiraiya','蛙','Exploration, improvisation, and learning through the world suit you.'),Yamato:outcome('Yamato','木','You grow through structure, stability, and steady accountability.'),Orochimaru:outcome('Orochimaru','蛇','Curiosity and unconventional experimentation pull the most out of you.')},questions:[
{id:'m1',theme:'Feedback',prompt:'What kind of correction helps you improve fastest?',answers:[answer('A quiet observation that makes me figure out the rest.',{Kakashi:5}),answer('Loud encouragement followed by another attempt immediately.',{'Might Guy':5}),answer('A direct explanation of exactly what was unacceptable.',{Tsunade:5}),answer('A story or experience that changes how I see the problem.',{Jiraiya:5}),answer('A repeatable process I can practice consistently.',{Yamato:5}),answer('A strange challenge nobody else would think to assign.',{Orochimaru:5})]},
{id:'m2',theme:'Training',prompt:'Choose your ideal training day.',answers:[answer('Small team drills with one difficult hidden lesson.',{Kakashi:5}),answer('Extreme conditioning and impossible-looking goals.',{'Might Guy':5}),answer('High-pressure practical work where mistakes matter.',{Tsunade:5}),answer('Travel somewhere unfamiliar and learn on the move.',{Jiraiya:5}),answer('Structured drills with measurable checkpoints.',{Yamato:5}),answer('Experiment with a technique that may not work at all.',{Orochimaru:5})]},
{id:'m3',theme:'Autonomy',prompt:'How much freedom do you want from a mentor?',answers:[answer('A lot—give me the objective and trust me.',{Kakashi:5}),answer('Some, but keep pushing me when I slow down.',{'Might Guy':5}),answer('Freedom after I prove I can handle the standard.',{Tsunade:5}),answer('Enough freedom to wander and discover things myself.',{Jiraiya:5}),answer('Clear boundaries with room inside them.',{Yamato:5}),answer('Nearly unlimited if the experiment teaches us something.',{Orochimaru:5})]},
{id:'m4',theme:'Failure',prompt:'You fail badly. What should your teacher do next?',answers:[answer('Ask one question that exposes what I missed.',{Kakashi:5}),answer('Make me try again before doubt settles in.',{'Might Guy':5}),answer('Explain the consequences, then rebuild the weak skill.',{Tsunade:5}),answer('Change environments and approach the lesson sideways.',{Jiraiya:5}),answer('Break the failure into steps and rebuild consistency.',{Yamato:5}),answer('Study the failure itself because it may reveal something new.',{Orochimaru:5})]},
{id:'m5',theme:'Respect',prompt:'What makes you respect a teacher most?',answers:[answer('They are obviously capable without needing to prove it.',{Kakashi:5}),answer('They work harder than the people they train.',{'Might Guy':5}),answer('Their standards never move just because things are hard.',{Tsunade:5}),answer('They have lived enough to teach beyond textbooks.',{Jiraiya:5}),answer('They make chaotic people function as a unit.',{Yamato:5}),answer('They know things nobody else even thinks to ask.',{Orochimaru:5})]},
{id:'m6',theme:'Specialty',prompt:'Which area would you most want a mentor to unlock?',answers:[answer('Tactical judgment',{Kakashi:5}),answer('Physical limits',{'Might Guy':5}),answer('Precision and resilience',{Tsunade:5}),answer('Versatility and fieldcraft',{Jiraiya:5}),answer('Control and teamwork',{Yamato:5}),answer('Forbidden or rare techniques',{Orochimaru:5})]},
{id:'m7',theme:'Pace',prompt:'How do you prefer progress to feel?',answers:[answer('Subtle until I suddenly realize how much better I am.',{Kakashi:5}),answer('Visible and intense every session.',{'Might Guy':5}),answer('Earned through difficult standards.',{Tsunade:5}),answer('Uneven but full of breakthroughs.',{Jiraiya:5}),answer('Steady and measurable.',{Yamato:5}),answer('Unpredictable and occasionally explosive.',{Orochimaru:5})]},
{id:'m8',theme:'Mission',prompt:'Which assignment from a sensei excites you?',answers:[answer('Analyze an opponent and devise a counter.',{Kakashi:5}),answer('Complete a ridiculous endurance challenge.',{'Might Guy':5}),answer('Keep someone alive under severe pressure.',{Tsunade:5}),answer('Travel alone and bring back intelligence.',{Jiraiya:5}),answer('Lead a difficult team without losing control.',{Yamato:5}),answer('Reverse-engineer an unknown technique.',{Orochimaru:5})]},
{id:'m9',theme:'Personality',prompt:'Which teacher personality is easiest for you to work with?',answers:[answer('Dry, calm, and occasionally mysterious.',{Kakashi:5}),answer('Energetic, emotional, and relentlessly positive.',{'Might Guy':5}),answer('Blunt, competent, and intimidating.',{Tsunade:5}),answer('Messy, funny, and unexpectedly wise.',{Jiraiya:5}),answer('Patient, responsible, and grounded.',{Yamato:5}),answer('Brilliant, strange, and unsettlingly curious.',{Orochimaru:5})]},
{id:'m10',theme:'Legacy',prompt:'What should a great sensei ultimately give a student?',answers:[answer('Judgment',{Kakashi:5}),answer('Belief',{'Might Guy':5}),answer('Competence',{Tsunade:5}),answer('Perspective',{Jiraiya:5}),answer('Stability',{Yamato:5}),answer('Possibility',{Orochimaru:5})]}
]};

// ===== ROGUE QUIZ =====
export const rogueTest:TestDefinition={id:'rogue',label:'Shadow Counterpart',shortLabel:'Shadow',icon:'暁',description:'Not a morality test—this maps which darker Naruto archetype most resembles your pressure points.',questionCount:10,lengths:{short:5,medium:8,long:10},outcomes:{Itachi:outcome('Itachi','烏','Burden, restraint, and long-term sacrifice define your shadow pattern.'),Pain:outcome('Pain','輪','Your shadow appears when ideals harden into systems and certainty.'),Konan:outcome('Konan','紙','Loyalty, discipline, and quiet commitment become your darker edge.'),Deidara:outcome('Deidara','爆','Expression, pride, and the need to make an impact drive your shadow.'),Sasori:outcome('Sasori','傀','Control and permanence become tempting when change feels unsafe.'),Kisame:outcome('Kisame','鮫','You may hide seriousness behind bluntness, endurance, or dark humor.'),Obito:outcome('Obito','面','Your shadow is most dangerous when loss changes the story you tell yourself.')},questions:[
{id:'r1',theme:'Pressure',prompt:'When hurt badly, what defense mechanism is most believable for you?',answers:[answer('Hide it and keep functioning.',{Itachi:5}),answer('Turn the pain into a worldview.',{Pain:5}),answer('Attach myself harder to the cause I still believe in.',{Konan:5}),answer('Create, perform, or make noise so I feel alive.',{Deidara:5}),answer('Try to control everything that can change.',{Sasori:5}),answer('Laugh, shrug, and become harder to shock.',{Kisame:5}),answer('Rewrite what the loss means until it changes who I am.',{Obito:5})]},
{id:'r2',theme:'Power',prompt:'What kind of power is most tempting when you feel powerless?',answers:[answer('Information nobody else has.',{Itachi:5}),answer('Authority over the entire system.',{Pain:5}),answer('Perfect coordination with one trusted cause.',{Konan:5}),answer('The ability to make everyone pay attention.',{Deidara:5}),answer('Control that freezes things exactly where I want them.',{Sasori:5}),answer('Enough raw strength that fear stops mattering.',{Kisame:5}),answer('The power to make reality match the world I wish existed.',{Obito:5})]},
{id:'r3',theme:'Conflict',prompt:'Which unhealthy conflict style could you fall into?',answers:[answer('Doing everything alone because explaining feels harder.',{Itachi:5}),answer('Assuming suffering proves my conclusion is correct.',{Pain:5}),answer('Following someone I trust farther than I should.',{Konan:5}),answer('Escalating because backing down feels like losing myself.',{Deidara:5}),answer('Removing emotion and treating people like pieces.',{Sasori:5}),answer('Becoming brutally detached from consequences.',{Kisame:5}),answer('Fixating on what should have happened instead.',{Obito:5})]},
{id:'r4',theme:'Legacy',prompt:'Which distorted legacy is most psychologically tempting?',answers:[answer('Being misunderstood if it protected everyone else.',{Itachi:5}),answer('Forcing peace because people cannot achieve it themselves.',{Pain:5}),answer('Keeping one promise no matter what it costs.',{Konan:5}),answer('Creating something nobody can forget.',{Deidara:5}),answer('Making something permanent enough to defeat loss.',{Sasori:5}),answer('Becoming so strong nothing can use me again.',{Kisame:5}),answer('Building a world where the worst thing never happened.',{Obito:5})]},
{id:'r5',theme:'Emotion',prompt:'What emotion is hardest to admit?',answers:[answer('Exhaustion',{Itachi:5}),answer('Helplessness',{Pain:5}),answer('Doubt',{Konan:5}),answer('Insecurity',{Deidara:5}),answer('Grief',{Sasori:5}),answer('Loneliness',{Kisame:5}),answer('Regret',{Obito:5})]},
{id:'r6',theme:'Trust',prompt:'What happens when trust breaks?',answers:[answer('I become even more self-contained.',{Itachi:5}),answer('I stop trusting individuals and start trusting rules or systems.',{Pain:5}),answer('I narrow my loyalty to very few people.',{Konan:5}),answer('I prove I never needed their approval.',{Deidara:5}),answer('I minimize dependence by controlling variables.',{Sasori:5}),answer('I expect betrayal and stop being surprised by it.',{Kisame:5}),answer('I obsess over the point where everything changed.',{Obito:5})]},
{id:'r7',theme:'Identity',prompt:'Which shadow statement is most dangerous because part of it sounds reasonable?',answers:[answer('Nobody needs to know what this costs me.',{Itachi:5}),answer('People only learn when consequences are severe enough.',{Pain:5}),answer('Loyalty means staying even when I disagree.',{Konan:5}),answer('If nobody reacts, it was not worth doing.',{Deidara:5}),answer('Things are safer when I control every detail.',{Sasori:5}),answer('Caring less makes you harder to hurt.',{Kisame:5}),answer('If reality is cruel enough, escaping it can feel rational.',{Obito:5})]},
{id:'r8',theme:'Method',prompt:'Your darker self would rather win by…',answers:[answer('Seeing ten moves ahead.',{Itachi:5}),answer('Making resistance feel pointless.',{Pain:5}),answer('Preparation and absolute commitment.',{Konan:5}),answer('Shock, creativity, and spectacle.',{Deidara:5}),answer('Precision and total control.',{Sasori:5}),answer('Endurance and brutal directness.',{Kisame:5}),answer('Manipulating the story around the conflict.',{Obito:5})]},
{id:'r9',theme:'Fear',prompt:'Which fear could shape you most if left unchecked?',answers:[answer('Failing people while they never understand why.',{Itachi:5}),answer('Living in a world where suffering has no meaning.',{Pain:5}),answer('Losing the person or cause that gives me direction.',{Konan:5}),answer('Being ordinary or forgettable.',{Deidara:5}),answer('Watching everything important decay.',{Sasori:5}),answer('Being weak enough to be used.',{Kisame:5}),answer('Accepting that some losses cannot be undone.',{Obito:5})]},
{id:'r10',theme:'Mirror',prompt:'Which word is the strongest warning sign for you?',answers:[answer('Burden',{Itachi:5}),answer('Certainty',{Pain:5}),answer('Devotion',{Konan:5}),answer('Ego',{Deidara:5}),answer('Control',{Sasori:5}),answer('Detachment',{Kisame:5}),answer('Escape',{Obito:5})]}
]};

// ===== CHAKRA QUIZ =====
export const chakraTest:TestDefinition={id:'chakra',label:'Chakra Nature',shortLabel:'Chakra',icon:'遁',description:'Measure your primary and secondary elemental tendencies from temperament and tactics.',questionCount:12,lengths:{short:6,medium:9,long:12},outcomes:{Fire:outcome('Fire','火','Expressive, decisive, and built to turn conviction into pressure.'),Wind:outcome('Wind','風','Independent, sharp, mobile, and naturally drawn to freedom of action.'),Lightning:outcome('Lightning','雷','Fast-thinking, forceful, ambitious, and comfortable committing in an instant.'),Earth:outcome('Earth','土','Grounded, durable, patient, and strongest when creating structure.'),Water:outcome('Water','水','Adaptive, perceptive, fluid, and capable of changing shape without losing purpose.')},questions:[
{id:'c1',theme:'Temperament',prompt:'When you care strongly about something, how does it show?',answers:[answer('It becomes visible immediately.',{Fire:5}),answer('I push for room to act my own way.',{Wind:5}),answer('I move fast before the opportunity disappears.',{Lightning:5}),answer('I become more stubborn and consistent.',{Earth:5}),answer('I adjust my approach until I get through.',{Water:5})]},
{id:'c2',theme:'Combat',prompt:'Which battlefield advantage feels strongest?',answers:[answer('Overwhelming pressure',{Fire:5}),answer('Reach and cutting angles',{Wind:5}),answer('Speed and penetration',{Lightning:5}),answer('Defense and terrain',{Earth:5}),answer('Flow and redirection',{Water:5})]},
{id:'c3',theme:'Problem',prompt:'A plan stops working halfway through. You…',answers:[answer('Increase commitment and force a breakthrough.',{Fire:5}),answer('Change direction completely.',{Wind:5}),answer('Exploit the first opening immediately.',{Lightning:5}),answer('Stabilize what still works before changing anything.',{Earth:5}),answer('Blend into the new situation and reshape the plan.',{Water:5})]},
{id:'c4',theme:'Motion',prompt:'Which movement pattern feels most natural?',answers:[answer('Forward',{Fire:5}),answer('Around',{Wind:5}),answer('Through',{Lightning:5}),answer('Against',{Earth:5}),answer('With',{Water:5})]},
{id:'c5',theme:'Team',prompt:'What energy do you bring to a team?',answers:[answer('Motivation',{Fire:5}),answer('Fresh angles',{Wind:5}),answer('Urgency',{Lightning:5}),answer('Reliability',{Earth:5}),answer('Adaptability',{Water:5})]},
{id:'c6',theme:'Weakness',prompt:'Which flaw sounds most familiar?',answers:[answer('Intensity becomes impatience.',{Fire:5}),answer('Independence becomes inconsistency.',{Wind:5}),answer('Speed becomes impulsiveness.',{Lightning:5}),answer('Stability becomes stubbornness.',{Earth:5}),answer('Flexibility becomes indecision.',{Water:5})]},
{id:'c7',theme:'Training',prompt:'Which exercise would you enjoy most?',answers:[answer('Sustain a technique at increasing intensity.',{Fire:5}),answer('Hit moving targets from impossible angles.',{Wind:5}),answer('React to unpredictable signals at full speed.',{Lightning:5}),answer('Hold position against increasing force.',{Earth:5}),answer('Mirror an opponent and redirect everything they do.',{Water:5})]},
{id:'c8',theme:'Presence',prompt:'How would others describe your strongest presence?',answers:[answer('Warm or intimidating',{Fire:5}),answer('Restless or freeing',{Wind:5}),answer('Electric or intense',{Lightning:5}),answer('Grounding or immovable',{Earth:5}),answer('Calm or difficult to pin down',{Water:5})]},
{id:'c9',theme:'Decision',prompt:'Under pressure, you trust…',answers:[answer('Conviction',{Fire:5}),answer('Instinct for direction',{Wind:5}),answer('Reaction speed',{Lightning:5}),answer('What has proven reliable',{Earth:5}),answer('Reading the room',{Water:5})]},
{id:'c10',theme:'Goal',prompt:'What kind of power feels most satisfying?',answers:[answer('Power that grows with passion.',{Fire:5}),answer('Power that cannot be contained.',{Wind:5}),answer('Power that arrives before resistance can form.',{Lightning:5}),answer('Power that remains after everything else breaks.',{Earth:5}),answer('Power that can become whatever the moment requires.',{Water:5})]},
{id:'c11',theme:'Element',prompt:'Ignore Naruto lore—pick the natural phenomenon you feel most drawn to.',answers:[answer('Wildfire',{Fire:5}),answer('High wind',{Wind:5}),answer('Thunderstorm',{Lightning:5}),answer('Mountain range',{Earth:5}),answer('Deep ocean',{Water:5})]},
{id:'c12',theme:'Instinct',prompt:'Pick one word without overthinking it.',answers:[answer('Ignite',{Fire:5}),answer('Cut',{Wind:5}),answer('Flash',{Lightning:5}),answer('Hold',{Earth:5}),answer('Flow',{Water:5})]}
]};

// ===== SUMMON QUIZ =====
export const summonTest:TestDefinition={id:'summon',label:'Summoning Contract',shortLabel:'Summon',icon:'契',description:'Find the summon family whose instincts and partnership style match yours.',questionCount:10,lengths:{short:5,medium:8,long:10},outcomes:{Toad:outcome('Toad','蛙','Bold, loyal, independent partners who respect courage and growth.'),Snake:outcome('Snake','蛇','Precise, ambitious, dangerous partners who respect self-possession.'),Slug:outcome('Slug','蛞','Patient, supportive partners built around protection, healing, and endurance.'),Hawk:outcome('Hawk','鷹','Focused, mobile partners who value freedom, vision, and decisive action.'),Ninken:outcome('Ninken','犬','Trust-driven partners who excel through loyalty, tracking, and teamwork.'),Monkey:outcome('Monkey','猿','Versatile, disciplined partners suited to experienced all-rounders.'),Crow:outcome('Crow','烏','Observant, deceptive partners who favor information and psychological advantage.'),Turtle:outcome('Turtle','亀','Steady, durable partners who reward patience and disciplined fundamentals.')},questions:[
{id:'s1',theme:'Bond',prompt:'What should a summon partnership feel like?',answers:[answer('Mutual respect between strong personalities.',{Toad:5}),answer('A precise contract where both sides know the stakes.',{Snake:5}),answer('Deep trust centered on keeping each other safe.',{Slug:5}),answer('Freedom to act independently toward the same goal.',{Hawk:5}),answer('Like family built through shared experience.',{Ninken:5}),answer('A professional partnership between capable veterans.',{Monkey:5}),answer('A quiet understanding where little needs to be said.',{Crow:5}),answer('Slow-earned trust that almost never breaks.',{Turtle:5})]},
{id:'s2',theme:'Mission',prompt:'Which summon job would you use most often?',answers:[answer('Heavy combat reinforcement',{Toad:5}),answer('Ambush and capture',{Snake:5}),answer('Healing and protection',{Slug:5}),answer('Aerial scouting',{Hawk:5}),answer('Tracking and coordinated pursuit',{Ninken:5}),answer('Weapon support and flexible combat',{Monkey:5}),answer('Reconnaissance and misdirection',{Crow:5}),answer('Defense and endurance training',{Turtle:5})]},
{id:'s3',theme:'Personality',prompt:'Which partner personality would you tolerate best?',answers:[answer('Loud but dependable',{Toad:5}),answer('Cold but competent',{Snake:5}),answer('Gentle and patient',{Slug:5}),answer('Proud and independent',{Hawk:5}),answer('Playful and loyal',{Ninken:5}),answer('Serious and experienced',{Monkey:5}),answer('Quiet and eerie',{Crow:5}),answer('Slow-moving but unshakable',{Turtle:5})]},
{id:'s4',theme:'Conflict',prompt:'If you disagree with your summon, what should happen?',answers:[answer('Argue it out, then fight together anyway.',{Toad:5}),answer('Whoever has the stronger logic wins.',{Snake:5}),answer('Find the choice that protects the most people.',{Slug:5}),answer('Split up and each handle what we do best.',{Hawk:5}),answer('Trust the relationship and compromise quickly.',{Ninken:5}),answer('Return to mission priorities and decide professionally.',{Monkey:5}),answer('Use subtle signals and avoid exposing disagreement.',{Crow:5}),answer('Take time and avoid a rushed decision.',{Turtle:5})]},
{id:'s5',theme:'Trait',prompt:'What trait do you most want your summon to add to you?',answers:[answer('Courage',{Toad:5}),answer('Precision',{Snake:5}),answer('Recovery',{Slug:5}),answer('Perspective',{Hawk:5}),answer('Instinct',{Ninken:5}),answer('Versatility',{Monkey:5}),answer('Misdirection',{Crow:5}),answer('Patience',{Turtle:5})]},
{id:'s6',theme:'Environment',prompt:'Where should your summon feel most at home?',answers:[answer('Wet mountain wilderness',{Toad:5}),answer('Caves and hidden places',{Snake:5}),answer('Quiet forests and protected spaces',{Slug:5}),answer('Open sky and cliffs',{Hawk:5}),answer('Forests, streets, anywhere scents travel',{Ninken:5}),answer('Ancient training grounds',{Monkey:5}),answer('Rooftops, trees, and shadowed observation points',{Crow:5}),answer('Rocky coasts and old temples',{Turtle:5})]},
{id:'s7',theme:'Combat',prompt:'How should a summon change a fight?',answers:[answer('Make the battlefield feel much bigger.',{Toad:5}),answer('Create one lethal opening.',{Snake:5}),answer('Make my team extremely hard to finish.',{Slug:5}),answer('Give me angles nobody else can reach.',{Hawk:5}),answer('Turn one fighter into a coordinated pack.',{Ninken:5}),answer('Give me another complete combat toolkit.',{Monkey:5}),answer('Make the enemy doubt what they see.',{Crow:5}),answer('Make losing ground nearly impossible.',{Turtle:5})]},
{id:'s8',theme:'Respect',prompt:'What earns an animal partner your respect fastest?',answers:[answer('Bravery',{Toad:5}),answer('Control',{Snake:5}),answer('Compassion',{Slug:5}),answer('Independence',{Hawk:5}),answer('Loyalty',{Ninken:5}),answer('Mastery',{Monkey:5}),answer('Intelligence',{Crow:5}),answer('Consistency',{Turtle:5})]},
{id:'s9',theme:'Risk',prompt:'Which partnership risk worries you least?',answers:[answer('We argue constantly.',{Toad:5}),answer('My summon is dangerous even to allies.',{Snake:5}),answer('We are not built for fast offense.',{Slug:5}),answer('My summon may ignore unnecessary orders.',{Hawk:5}),answer('We become too emotionally attached.',{Ninken:5}),answer('The standard to earn respect is extremely high.',{Monkey:5}),answer('Other people find the partnership unsettling.',{Crow:5}),answer('Our style may be slow to develop.',{Turtle:5})]},
{id:'s10',theme:'Instinct',prompt:'Pick a summon silhouette.',answers:[answer('Huge and grounded',{Toad:5}),answer('Long and coiled',{Snake:5}),answer('Soft and spreading',{Slug:5}),answer('High and diving',{Hawk:5}),answer('Fast and pack-oriented',{Ninken:5}),answer('Compact and weapon-ready',{Monkey:5}),answer('Dark and circling',{Crow:5}),answer('Armored and immovable',{Turtle:5})]}
]};

// ===== ADVANCED IDENTITY QUIZZES =====
const advancedAnswer = (text: string, scores: Record<string, number>): Answer => ({ text, scores });
const advancedQuestion = (id: string, theme: string, prompt: string, answers: Answer[]): Question => ({ id, theme, prompt, answers });
const advancedOutcome = (id: string, label: string, symbol: string, description: string, rarity?: number): Outcome => ({ id, label, symbol, description, ...(rarity ? { rarity } : {}) });

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
    advancedOutcome('close', 'Close-Range Pressure', '拳', 'You thrive by taking space, forcing reactions, and staying inside an opponent’s comfort zone.'),
    advancedOutcome('precision', 'Precision Striker', '針', 'You prefer clean openings, efficient movement, and decisive attacks over wasted motion.'),
    advancedOutcome('control', 'Field Controller', '陣', 'You win by shaping distance, tempo, positioning, and the choices available to everyone else.'),
    advancedOutcome('adaptive', 'Adaptive Fighter', '変', 'You are strongest when reading the situation and changing plans faster than the opponent can adjust.'),
    advancedOutcome('support', 'Support Fighter', '援', 'Your instincts naturally create openings, protection, and momentum for the rest of the squad.'),
    advancedOutcome('stealth', 'Stealth Specialist', '影', 'You prefer information, concealment, misdirection, and attacking only when the situation favors you.'),
  ],
  [
    advancedQuestion('fight-1', 'Opening', 'A fight starts before either side has a complete plan. What do you do first?', [
      advancedAnswer('Close the gap immediately and force them to react to me.', { close: 5, adaptive: 1 }),
      advancedAnswer('Stay composed and wait for the first clean mistake.', { precision: 5, stealth: 1 }),
      advancedAnswer('Take the best position and limit where they can move.', { control: 5, support: 1 }),
      advancedAnswer('Probe with a safe action, read the response, then change gears.', { adaptive: 5, precision: 1 }),
    ]),
    advancedQuestion('fight-2', 'Pressure', 'A stronger opponent is walking your team backward. What feels most natural?', [
      advancedAnswer('Meet the pressure directly and make them work for every step.', { close: 5, control: 1 }),
      advancedAnswer('Create a narrow opening and punish one overextension.', { precision: 5, stealth: 1 }),
      advancedAnswer('Redirect the encounter so their strength matters less.', { control: 5, adaptive: 2 }),
      advancedAnswer('Cover teammates and create a safe reset for the squad.', { support: 5, control: 1 }),
    ]),
    advancedQuestion('fight-3', 'Tempo', 'Which pace gives you the biggest advantage?', [
      advancedAnswer('Fast, physical, and relentless.', { close: 5 }),
      advancedAnswer('Measured, with short bursts when the opening appears.', { precision: 5 }),
      advancedAnswer('A pace I can constantly change to keep them guessing.', { adaptive: 5 }),
      advancedAnswer('Slow enough that I can disappear from their expectations.', { stealth: 5, control: 1 }),
    ]),
    advancedQuestion('fight-4', 'Team', 'Your teammate commits to an attack that is about to fail. What do you do?', [
      advancedAnswer('Join them and turn the bad commitment into overwhelming pressure.', { close: 4, support: 2 }),
      advancedAnswer('Hit the exact weakness created by the opponent’s response.', { precision: 5 }),
      advancedAnswer('Cut off the opponent’s escape route so the attack can still work.', { control: 5, support: 2 }),
      advancedAnswer('Change my role instantly and cover whatever the team now lacks.', { adaptive: 5, support: 2 }),
    ]),
    advancedQuestion('fight-5', 'Information', 'You know almost nothing about the opponent. What gives you confidence?', [
      advancedAnswer('I can test their limits up close and learn while moving.', { close: 4, adaptive: 2 }),
      advancedAnswer('I only need one reliable pattern to exploit.', { precision: 5 }),
      advancedAnswer('I can make the environment tell me how they want to fight.', { control: 5 }),
      advancedAnswer('I can stay difficult to read until I know enough to commit.', { stealth: 5, adaptive: 1 }),
    ]),
    advancedQuestion('fight-6', 'Defense', 'Your opponent launches a complicated combination. Your preferred defense?', [
      advancedAnswer('Crowd them so they cannot complete the sequence cleanly.', { close: 5 }),
      advancedAnswer('Evade the minimum amount and counter the weakest transition.', { precision: 5 }),
      advancedAnswer('Break their spacing and force the sequence into a bad angle.', { control: 5 }),
      advancedAnswer('Protect the teammate most exposed by the attack.', { support: 5 }),
    ]),
    advancedQuestion('fight-7', 'Reputation', 'Which reputation sounds best?', [
      advancedAnswer('Impossible to push backward.', { close: 5 }),
      advancedAnswer('Rarely wastes a movement.', { precision: 5 }),
      advancedAnswer('Makes every encounter happen on their terms.', { control: 5 }),
      advancedAnswer('Never fights the same way twice.', { adaptive: 5 }),
    ]),
    advancedQuestion('fight-8', 'Squad Value', 'What contribution to a squad feels most satisfying?', [
      advancedAnswer('Breaking through the point everyone else is stuck on.', { close: 4, support: 1 }),
      advancedAnswer('Ending the key threat before it becomes a larger problem.', { precision: 5 }),
      advancedAnswer('Making the entire team safer and more effective.', { support: 5, control: 1 }),
      advancedAnswer('Finding the unseen angle that changes the whole mission.', { stealth: 5, adaptive: 1 }),
    ]),
    advancedQuestion('fight-9', 'Mistake', 'An opponent correctly predicts your favorite approach. What next?', [
      advancedAnswer('Double down with more pressure and make prediction irrelevant.', { close: 5 }),
      advancedAnswer('Use the prediction itself to create a false opening.', { precision: 4, stealth: 3 }),
      advancedAnswer('Change the terrain or spacing before engaging again.', { control: 5 }),
      advancedAnswer('Abandon the approach completely and build a new plan mid-fight.', { adaptive: 5 }),
    ]),
    advancedQuestion('fight-10', 'Peak', 'At your best, what does the fight feel like?', [
      advancedAnswer('The opponent never gets enough room to breathe or reset.', { close: 5 }),
      advancedAnswer('Everything slows down until the correct opening becomes obvious.', { precision: 5 }),
      advancedAnswer('Every person on the field is moving where I expected them to.', { control: 5 }),
      advancedAnswer('The opponent realizes too late that they never understood my plan.', { stealth: 4, adaptive: 3 }),
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
    advancedOutcome('blade', 'Blade Specialist', '刀', 'You favor direct control, clean technique, and a weapon that rewards precision at close range.'),
    advancedOutcome('projectile', 'Projectile Specialist', '手', 'You prefer range, angles, timing, and forcing opponents to respect multiple lines of attack.'),
    advancedOutcome('staff', 'Staff Specialist', '棒', 'You value reach, balance, defense, and a tool that adapts to many situations.'),
    advancedOutcome('chain', 'Flexible Weapon Specialist', '鎖', 'You are drawn to unusual range, entanglement, momentum, and controlling unpredictable space.'),
    advancedOutcome('unarmed', 'Unarmed Specialist', '拳', 'You trust movement, timing, conditioning, and your own body more than external equipment.'),
    advancedOutcome('none', 'Technique-First Shinobi', '術', 'Your instinct is to rely primarily on chakra, ninjutsu, and tactics rather than a signature weapon.'),
  ],
  [
    advancedQuestion('weapon-1', 'Feel', 'Which quality matters most in a signature fighting tool?', [
      advancedAnswer('Immediate precision and dependable control.', { blade: 5 }),
      advancedAnswer('Reach and the ability to threaten from different angles.', { projectile: 4, staff: 2 }),
      advancedAnswer('Versatility between offense, defense, and movement.', { staff: 5, chain: 1 }),
      advancedAnswer('I would rather build my style around chakra and movement than a weapon.', { none: 5, unarmed: 2 }),
    ]),
    advancedQuestion('weapon-2', 'Distance', 'What distance feels most comfortable?', [
      advancedAnswer('Close enough that small technical differences decide everything.', { blade: 4, unarmed: 3 }),
      advancedAnswer('Far enough that positioning and accuracy matter more than strength.', { projectile: 5 }),
      advancedAnswer('Just outside normal striking range where I can control entry.', { staff: 5 }),
      advancedAnswer('A constantly changing distance that is awkward for the opponent.', { chain: 5 }),
    ]),
    advancedQuestion('weapon-3', 'Training', 'Which training session sounds most satisfying?', [
      advancedAnswer('Repeating precise cuts and transitions until they are automatic.', { blade: 5 }),
      advancedAnswer('Hitting small moving targets from increasingly difficult positions.', { projectile: 5 }),
      advancedAnswer('Footwork, leverage, guards, and combinations with a long weapon.', { staff: 5 }),
      advancedAnswer('Conditioning, body mechanics, and chakra control without depending on gear.', { unarmed: 4, none: 3 }),
    ]),
    advancedQuestion('weapon-4', 'Problem Solving', 'An opponent has a strong defensive guard. How do you want to solve it?', [
      advancedAnswer('Find the exact seam and cut through the structure of the guard.', { blade: 5 }),
      advancedAnswer('Attack from multiple angles until they cannot cover all of them.', { projectile: 5 }),
      advancedAnswer('Use leverage and reach to move the guard where I want it.', { staff: 5 }),
      advancedAnswer('Entangle, redirect, or pull the guard out of position.', { chain: 5 }),
    ]),
    advancedQuestion('weapon-5', 'Mobility', 'Which style best matches how you like to move?', [
      advancedAnswer('Compact footwork with sharp entries and exits.', { blade: 5 }),
      advancedAnswer('Constant repositioning to preserve lines of sight.', { projectile: 5 }),
      advancedAnswer('Grounded movement with strong balance and circular control.', { staff: 5 }),
      advancedAnswer('Free movement where my hands, feet, and chakra are always available.', { unarmed: 4, none: 2 }),
    ]),
    advancedQuestion('weapon-6', 'Creativity', 'What kind of creativity appeals to you most?', [
      advancedAnswer('Finding many techniques inside one simple, reliable weapon.', { blade: 4, staff: 2 }),
      advancedAnswer('Using ricochets, trajectories, traps, and timing.', { projectile: 5 }),
      advancedAnswer('Turning momentum and unusual angles into control.', { chain: 5 }),
      advancedAnswer('Combining ninjutsu, movement, feints, and terrain without a fixed tool.', { none: 5, unarmed: 1 }),
    ]),
    advancedQuestion('weapon-7', 'Reliability', 'If you could carry only one option for a long mission, what sounds safest?', [
      advancedAnswer('A well-maintained blade I know completely.', { blade: 5 }),
      advancedAnswer('A compact set of ranged tools with several uses.', { projectile: 5 }),
      advancedAnswer('A durable staff that works as weapon, defense, and utility tool.', { staff: 5 }),
      advancedAnswer('Nothing essential—I want my body and chakra to remain the core of the style.', { unarmed: 3, none: 4 }),
    ]),
    advancedQuestion('weapon-8', 'Control', 'How do you most want a weapon to influence an opponent?', [
      advancedAnswer('Make them respect every close-range opening.', { blade: 5 }),
      advancedAnswer('Make them constantly worry about where the next attack comes from.', { projectile: 5 }),
      advancedAnswer('Keep them exactly at the distance I choose.', { staff: 5 }),
      advancedAnswer('Make their movement awkward through wraps, arcs, and changing reach.', { chain: 5 }),
    ]),
    advancedQuestion('weapon-9', 'Identity', 'Which statement sounds most like you?', [
      advancedAnswer('Master one elegant tool deeply.', { blade: 5 }),
      advancedAnswer('Accuracy and preparation beat raw force.', { projectile: 5 }),
      advancedAnswer('Versatility is more valuable than specialization.', { staff: 4, none: 2 }),
      advancedAnswer('My body and techniques should be enough even if every tool is taken away.', { unarmed: 4, none: 3 }),
    ]),
    advancedQuestion('weapon-10', 'Peak', 'At your peak, what makes your style impressive?', [
      advancedAnswer('The blade seems like an extension of thought.', { blade: 5 }),
      advancedAnswer('The opponent is pressured from angles they cannot track at once.', { projectile: 5 }),
      advancedAnswer('Range and leverage make every exchange look controlled.', { staff: 5 }),
      advancedAnswer('The style is impossible to disarm because no single tool defines it.', { unarmed: 3, none: 4, chain: 1 }),
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
    advancedOutcome('commander', 'Commander', '令', 'You create clarity through decisive direction and are comfortable owning the final call.'),
    advancedOutcome('strategist', 'Strategist', '策', 'You lead by understanding the board, building contingencies, and putting people where they succeed.'),
    advancedOutcome('inspirer', 'Inspirer', '火', 'You raise performance through confidence, momentum, and belief in the people around you.'),
    advancedOutcome('guardian', 'Guardian', '盾', 'You lead through responsibility, protection, and making sure nobody is left behind.'),
    advancedOutcome('independent', 'Lead-by-Example', '孤', 'You prefer autonomy, competence, and influence earned through action rather than constant direction.'),
  ],
  [
    advancedQuestion('lead-1', 'Crisis', 'The squad freezes during a sudden crisis. What do you do?', [
      advancedAnswer('Give immediate assignments and establish a clear chain of action.', { commander: 5 }),
      advancedAnswer('Identify the real problem, then assign people based on strengths.', { strategist: 5 }),
      advancedAnswer('Get everyone moving by restoring confidence and urgency.', { inspirer: 5 }),
      advancedAnswer('Stabilize the most exposed teammate first, then rebuild the formation.', { guardian: 5 }),
    ]),
    advancedQuestion('lead-2', 'Planning', 'How should a team prepare for an uncertain mission?', [
      advancedAnswer('Everyone should know the objective, role, and who makes the final call.', { commander: 5 }),
      advancedAnswer('Build several branches so the plan survives unexpected changes.', { strategist: 5 }),
      advancedAnswer('Make sure everyone understands why the mission matters and trusts one another.', { inspirer: 5 }),
      advancedAnswer('Give capable people room to solve their part without micromanagement.', { independent: 5 }),
    ]),
    advancedQuestion('lead-3', 'Failure', 'A teammate makes a costly mistake. Your first leadership response?', [
      advancedAnswer('Take control of the immediate situation, then address the mistake later.', { commander: 5 }),
      advancedAnswer('Understand which assumption or process failed.', { strategist: 5 }),
      advancedAnswer('Keep the mistake from destroying their confidence.', { inspirer: 4, guardian: 2 }),
      advancedAnswer('Protect the team from further consequences and help them recover.', { guardian: 5 }),
    ]),
    advancedQuestion('lead-4', 'Authority', 'What makes someone worth following?', [
      advancedAnswer('They can make hard decisions when nobody else wants to.', { commander: 5 }),
      advancedAnswer('Their plans consistently account for details others miss.', { strategist: 5 }),
      advancedAnswer('People become better around them.', { inspirer: 5 }),
      advancedAnswer('They never ask others to do something they would not do themselves.', { independent: 5, guardian: 1 }),
    ]),
    advancedQuestion('lead-5', 'Conflict', 'Two talented teammates strongly disagree. What do you do?', [
      advancedAnswer('Hear both sides, decide, and move the team forward.', { commander: 5 }),
      advancedAnswer('Test both arguments against the mission constraints.', { strategist: 5 }),
      advancedAnswer('Find the shared goal and rebuild cooperation around it.', { inspirer: 5 }),
      advancedAnswer('Let them own their areas unless the conflict begins hurting the team.', { independent: 5 }),
    ]),
    advancedQuestion('lead-6', 'Risk', 'A mission can succeed faster if one person takes a major risk. Your instinct?', [
      advancedAnswer('Choose the best person and make the call if the objective justifies it.', { commander: 5 }),
      advancedAnswer('Look for a lower-risk route that produces nearly the same result.', { strategist: 4, guardian: 2 }),
      advancedAnswer('Ask for a volunteer and make sure they know the team believes in them.', { inspirer: 4, independent: 1 }),
      advancedAnswer('Avoid making one teammate carry a risk the whole squad could share.', { guardian: 5 }),
    ]),
    advancedQuestion('lead-7', 'Growth', 'How do you help a talented but inconsistent teammate improve?', [
      advancedAnswer('Set a clear standard and hold them accountable to it.', { commander: 5 }),
      advancedAnswer('Diagnose exactly where their process breaks down.', { strategist: 5 }),
      advancedAnswer('Help them see what they can become and build momentum.', { inspirer: 5 }),
      advancedAnswer('Give them ownership and let responsibility force growth.', { independent: 5 }),
    ]),
    advancedQuestion('lead-8', 'Protection', 'Your plan works, but a teammate is becoming overwhelmed. What happens?', [
      advancedAnswer('Reassign roles immediately so the mission remains stable.', { commander: 4, guardian: 2 }),
      advancedAnswer('Adjust the plan around the new limitation.', { strategist: 5 }),
      advancedAnswer('Stay close enough to keep them engaged and confident.', { inspirer: 4, guardian: 2 }),
      advancedAnswer('Take pressure off them even if it costs efficiency.', { guardian: 5 }),
    ]),
    advancedQuestion('lead-9', 'Presence', 'How do you want a squad to feel when you are present?', [
      advancedAnswer('Clear about what happens next.', { commander: 5 }),
      advancedAnswer('Prepared for more possibilities than the opposition.', { strategist: 5 }),
      advancedAnswer('More confident and capable than they were alone.', { inspirer: 5 }),
      advancedAnswer('Safe enough to focus completely on their jobs.', { guardian: 5 }),
    ]),
    advancedQuestion('lead-10', 'Legacy', 'What would be the best proof of your leadership?', [
      advancedAnswer('The team can act decisively even when I am absent.', { commander: 4, independent: 2 }),
      advancedAnswer('The systems and plans I built keep working after I leave.', { strategist: 5 }),
      advancedAnswer('People I led eventually surpass me.', { inspirer: 5 }),
      advancedAnswer('People trust me because I consistently carried my share without demanding attention.', { independent: 4, guardian: 2 }),
    ]),
  ],
);

export const rankTest = makeTest(
  'rank',
  'Rank Potential',
  'Rank',
  '★',
  'Estimate the highest level of responsibility, judgment, and influence your answers point toward.',
  [
    advancedOutcome('genin', 'Genin Potential', '下', 'Your profile favors learning through direct experience while core instincts are still developing.'),
    advancedOutcome('chunin', 'Chūnin Potential', '中', 'You show the reliability and judgment expected from a dependable field operator.'),
    advancedOutcome('special', 'Special Jōnin Potential', '特', 'You show unusually strong specialist ability even if you are not built around broad command.'),
    advancedOutcome('jonin', 'Jōnin Potential', '上', 'You combine independence, tactical judgment, versatility, and responsibility at a high level.'),
    advancedOutcome('elite', 'Elite Jōnin Potential', '精', 'Your profile points toward exceptional field capability and the ability to solve high-risk problems independently.'),
    advancedOutcome('kage', 'Kage Candidate', '影', 'You have the elite field ability and broad responsibility expected from someone who could eventually enter village-level leadership.'),
    advancedOutcome('kagePotential', 'Kage Potential', '冠', 'Your answers consistently show village-scale judgment, leadership, accountability, adaptability, and the ability to make decisions that affect more than one squad.', 1.06),
    advancedOutcome('legendary', 'Legendary Potential', '神', 'An exceptionally rare profile: elite capability combined with extraordinary judgment, responsibility, influence, resilience, and the ability to reshape how an entire village operates.', 1.20),
  ],
  [
    advancedQuestion('rank-1', 'Responsibility', 'A mission begins failing for reasons outside your assignment. What do you do?', [
      advancedAnswer('Focus on my assigned role and ask for direction before changing it.', { genin: 5, chunin: 1 }),
      advancedAnswer('Adjust my part and communicate the change clearly to the squad.', { chunin: 5, jonin: 1 }),
      advancedAnswer('Take ownership of the immediate problem if it matches my expertise.', { special: 5, jonin: 2, elite: 1 }),
      advancedAnswer('Reassess the whole mission, coordinate a new direction, and own the consequences.', { jonin: 3, elite: 3, kage: 3, kagePotential: 4, legendary: 2 }),
    ]),
    advancedQuestion('rank-2', 'Judgment', 'You receive an order that no longer fits the situation. What is your instinct?', [
      advancedAnswer('Follow it unless someone senior changes the instruction.', { genin: 5 }),
      advancedAnswer('Use reasonable judgment within the intent of the order.', { chunin: 5, jonin: 1 }),
      advancedAnswer('Change the method if my specialty gives me a clearly better solution.', { special: 4, jonin: 3, elite: 1 }),
      advancedAnswer('Choose the best available course, explain why, and accept full responsibility for the outcome.', { jonin: 3, elite: 3, kage: 3, kagePotential: 4, legendary: 3 }),
    ]),
    advancedQuestion('rank-3', 'Scope', 'Which responsibility sounds most natural?', [
      advancedAnswer('Execute my role well and keep learning.', { genin: 5 }),
      advancedAnswer('Coordinate a small team through a defined objective.', { chunin: 5, jonin: 1 }),
      advancedAnswer('Be the expert called when one difficult problem needs solving.', { special: 5, elite: 2 }),
      advancedAnswer('Lead complex missions whose decisions can affect multiple teams or the wider village.', { jonin: 2, elite: 3, kage: 4, kagePotential: 4, legendary: 2 }),
    ]),
    advancedQuestion('rank-4', 'Uncertainty', 'How much uncertainty can you comfortably own?', [
      advancedAnswer('I perform best with clear expectations and feedback.', { genin: 5 }),
      advancedAnswer('I can handle normal field uncertainty if the objective is clear.', { chunin: 5 }),
      advancedAnswer('A lot, as long as the problem is inside my strongest discipline.', { special: 5, elite: 2 }),
      advancedAnswer('I can make high-impact decisions with incomplete information while accounting for long-term consequences.', { jonin: 2, elite: 3, kage: 3, kagePotential: 5, legendary: 3 }),
    ]),
    advancedQuestion('rank-5', 'Team', 'A less-experienced teammate is struggling during a mission. What do you do?', [
      advancedAnswer('Help with the immediate task and look to the leader for the larger adjustment.', { genin: 4, chunin: 2 }),
      advancedAnswer('Coach them enough to keep the squad functioning.', { chunin: 5, jonin: 1 }),
      advancedAnswer('Cover the technical weakness if it falls inside my specialty.', { special: 5, elite: 2 }),
      advancedAnswer('Restructure the plan so they can succeed, preserve the mission, and learn from the situation afterward.', { jonin: 3, elite: 3, kage: 3, kagePotential: 4, legendary: 2 }),
    ]),
    advancedQuestion('rank-6', 'Complexity', 'Which mission would you rather receive?', [
      advancedAnswer('A clear objective where I can prove fundamentals.', { genin: 5 }),
      advancedAnswer('A multi-step field mission with a small team.', { chunin: 5, jonin: 1 }),
      advancedAnswer('A difficult assignment chosen specifically for my rare skill set.', { special: 5, elite: 3 }),
      advancedAnswer('A mission with incomplete intelligence where several squads depend on my judgment.', { jonin: 2, elite: 3, kage: 3, kagePotential: 5, legendary: 3 }),
    ]),
    advancedQuestion('rank-7', 'Leadership', 'How naturally do you take responsibility for other people’s decisions?', [
      advancedAnswer('I would rather master my own decisions first.', { genin: 5, special: 1 }),
      advancedAnswer('I can supervise a small group when roles are clear.', { chunin: 5, jonin: 1 }),
      advancedAnswer('I prefer expert responsibility over broad command.', { special: 5, elite: 2 }),
      advancedAnswer('I am comfortable owning the strategy, the people executing it, and the consequences beyond the mission itself.', { jonin: 2, elite: 3, kage: 4, kagePotential: 5, legendary: 4 }),
    ]),
    advancedQuestion('rank-8', 'Failure', 'A major mission fails under your command. What happens next?', [
      advancedAnswer('I need senior guidance to understand what I missed.', { genin: 5 }),
      advancedAnswer('I review my decisions and improve the process for the next mission.', { chunin: 5, jonin: 1 }),
      advancedAnswer('I identify whether my expertise failed or was used incorrectly.', { special: 5, elite: 2 }),
      advancedAnswer('I take responsibility, protect the team from blame-shifting, rebuild the strategy, and change the system that allowed the failure.', { jonin: 2, elite: 2, kage: 3, kagePotential: 3, legendary: 9 }),
    ]),
    advancedQuestion('rank-9', 'Village', 'What kind of impact sounds most satisfying?', [
      advancedAnswer('Becoming clearly stronger and more capable than I am now.', { genin: 5 }),
      advancedAnswer('Being someone others can reliably put in charge of a squad.', { chunin: 5, jonin: 2 }),
      advancedAnswer('Becoming one of the village’s best people in a specific discipline.', { special: 5, elite: 3 }),
      advancedAnswer('Improving how the entire village responds to its hardest problems and preparing the next generation to surpass me.', { elite: 2, kage: 3, kagePotential: 3, legendary: 10 }),
    ]),
    advancedQuestion('rank-10', 'Peak', 'At your absolute peak, which description fits best?', [
      advancedAnswer('A talented shinobi with huge room to grow.', { genin: 5 }),
      advancedAnswer('A trusted squad leader who consistently gets people home.', { chunin: 5, jonin: 2 }),
      advancedAnswer('A specialist whose name is known across villages for one discipline.', { special: 5, elite: 4 }),
      advancedAnswer('A leader whose judgment can carry a village through crises and whose influence changes the generation that follows.', { elite: 2, kage: 3, kagePotential: 3, legendary: 11 }),
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
    advancedOutcome('dojutsu', 'Ocular Potential', '眼', 'Your profile emphasizes observation, perception, prediction, and information processed through sight.'),
    advancedOutcome('body', 'Physical Bloodline Potential', '体', 'Your strengths point toward unusual physiology, durability, mobility, or body-based techniques.'),
    advancedOutcome('chakra', 'Chakra Gift', '脈', 'Your profile suggests exceptional reserves, control, recovery, or an unusual relationship with chakra itself.'),
    advancedOutcome('sensory', 'Sensory Gift', '感', 'Awareness, detection, intuition, and reading subtle information are central to your potential.'),
    advancedOutcome('elemental', 'Elemental Bloodline Potential', '遁', 'Your profile favors unusually deep elemental affinity or the possibility of a combined nature.'),
    advancedOutcome('none', 'Training-Built Talent', '鍛', 'Your strongest path is not an inherited shortcut but mastery built through discipline, creativity, and repetition.'),
  ],
  [
    advancedQuestion('inherited-1', 'Instinct', 'Which unusual advantage would feel most natural to discover you had?', [
      advancedAnswer('I can notice visual details and movements other people miss.', { dojutsu: 5, sensory: 1 }),
      advancedAnswer('My body handles strain, impact, or movement in an unusual way.', { body: 5 }),
      advancedAnswer('My chakra feels deeper or easier to control than expected.', { chakra: 5 }),
      advancedAnswer('I can sense people or changes without needing to see them directly.', { sensory: 5 }),
    ]),
    advancedQuestion('inherited-2', 'Training', 'Which ability would change your training most?', [
      advancedAnswer('Enhanced perception that lets me study and react to technique more precisely.', { dojutsu: 5 }),
      advancedAnswer('A body that supports techniques most people could not physically sustain.', { body: 5 }),
      advancedAnswer('Enough control or reserves to practice chakra-intensive skills longer.', { chakra: 5 }),
      advancedAnswer('An elemental affinity strong enough to reshape my entire fighting style.', { elemental: 5 }),
    ]),
    advancedQuestion('inherited-3', 'Information', 'What kind of hidden information would you most want access to?', [
      advancedAnswer('Tiny changes in movement, expression, and visual patterns.', { dojutsu: 5 }),
      advancedAnswer('The exact condition and limits of my own body.', { body: 4, chakra: 1 }),
      advancedAnswer('The flow and quality of chakra around me.', { chakra: 4, sensory: 2 }),
      advancedAnswer('Presence, distance, direction, or intent beyond normal senses.', { sensory: 5 }),
    ]),
    advancedQuestion('inherited-4', 'Power', 'Which kind of rare power interests you least?', [
      advancedAnswer('Anything that only works because I was born with special eyes.', { none: 4, body: 1 }),
      advancedAnswer('Anything that depends on changing my body in extreme ways.', { none: 4, chakra: 1 }),
      advancedAnswer('Anything that mostly increases raw chakra without improving skill.', { none: 4, elemental: 1 }),
      advancedAnswer('None of those bother me if the ability creates a unique tactical advantage.', { dojutsu: 2, body: 2, chakra: 2, sensory: 2, elemental: 2 }),
    ]),
    advancedQuestion('inherited-5', 'Element', 'How do elemental techniques feel to you conceptually?', [
      advancedAnswer('Useful, but perception and timing matter more than the element itself.', { dojutsu: 4, sensory: 2 }),
      advancedAnswer('Most interesting when the element physically changes how I can move or fight.', { body: 4, elemental: 2 }),
      advancedAnswer('A natural expression of chakra control.', { chakra: 4, elemental: 2 }),
      advancedAnswer('Potentially the core of my identity if I had an unusually deep affinity.', { elemental: 5 }),
    ]),
    advancedQuestion('inherited-6', 'Reliance', 'Would you want your rare trait to define your entire identity?', [
      advancedAnswer('Yes, if it creates a completely different way of seeing a fight.', { dojutsu: 5 }),
      advancedAnswer('Yes, if it changes what my body can physically do.', { body: 5 }),
      advancedAnswer('Only if it deepens techniques I already value instead of replacing them.', { chakra: 4, elemental: 2 }),
      advancedAnswer('No. I would rather be known for what I built through training.', { none: 5 }),
    ]),
    advancedQuestion('inherited-7', 'Awareness', 'Which situation would you most want a hidden advantage in?', [
      advancedAnswer('Reading an opponent’s next movement.', { dojutsu: 5 }),
      advancedAnswer('Surviving physical conditions others cannot.', { body: 5 }),
      advancedAnswer('Detecting threats before the rest of the squad notices them.', { sensory: 5 }),
      advancedAnswer('Using two elemental properties together in a way others cannot easily copy.', { elemental: 5 }),
    ]),
    advancedQuestion('inherited-8', 'Growth', 'How should an inherited gift grow?', [
      advancedAnswer('Through sharper interpretation and increasingly advanced perception.', { dojutsu: 5 }),
      advancedAnswer('Through conditioning and learning the limits of the body.', { body: 5 }),
      advancedAnswer('Through better efficiency, control, and chakra capacity.', { chakra: 5 }),
      advancedAnswer('It should matter less than disciplined training as I become stronger.', { none: 5 }),
    ]),
    advancedQuestion('inherited-9', 'Support', 'Which rare trait would help a squad most?', [
      advancedAnswer('Seeing threats and patterns nobody else catches.', { dojutsu: 4, sensory: 2 }),
      advancedAnswer('Being able to physically perform roles others cannot.', { body: 5 }),
      advancedAnswer('Having the reserves and control to sustain difficult techniques.', { chakra: 5 }),
      advancedAnswer('Detecting distant or concealed threats before contact.', { sensory: 5 }),
    ]),
    advancedQuestion('inherited-10', 'Legacy', 'Which legacy sounds most appealing?', [
      advancedAnswer('A perception ability with a distinct original visual signature.', { dojutsu: 5 }),
      advancedAnswer('A physical trait that creates techniques unique to the bloodline.', { body: 5 }),
      advancedAnswer('An elemental gift that produces a rare nature or combination.', { elemental: 5, chakra: 1 }),
      advancedAnswer('A reputation proving exceptional shinobi do not need an inherited advantage.', { none: 5 }),
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
    advancedOutcome('tracker', 'Tracker', '跡', 'You excel at pursuit, trails, patterns, and turning tiny clues into direction.'),
    advancedOutcome('medic', 'Medical Specialist', '医', 'You are drawn to precision, recovery, support, and keeping a team functional under pressure.'),
    advancedOutcome('sensor', 'Sensor', '感', 'Your value comes from awareness, detection, early warning, and information the rest of the squad cannot easily access.'),
    advancedOutcome('infiltrator', 'Infiltrator', '潜', 'You favor subtle movement, disguise, access, misdirection, and solving objectives without unnecessary confrontation.'),
    advancedOutcome('duelist', 'Duelist', '決', 'You are strongest when a difficult individual threat must be understood and neutralized directly.'),
    advancedOutcome('barrier', 'Barrier & Sealing Specialist', '封', 'You prefer preparation, containment, protection, and techniques that define rules for the encounter.'),
    advancedOutcome('tactician', 'Tactician', '策', 'Your greatest contribution is connecting information, people, timing, and resources into a better plan.'),
  ],
  [
    advancedQuestion('specialty-1', 'Mission', 'Which assignment would you choose first?', [
      advancedAnswer('Find someone who disappeared with almost no trail left behind.', { tracker: 5, sensor: 1 }),
      advancedAnswer('Keep a squad operational during a long dangerous mission.', { medic: 5 }),
      advancedAnswer('Locate hidden threats before the team enters the area.', { sensor: 5 }),
      advancedAnswer('Enter a protected location, get what is needed, and leave unnoticed.', { infiltrator: 5 }),
    ]),
    advancedQuestion('specialty-2', 'Problem', 'Which difficult problem sounds most satisfying to solve?', [
      advancedAnswer('Reconstructing where someone went from small environmental clues.', { tracker: 5 }),
      advancedAnswer('Stabilizing someone when there is almost no time to think.', { medic: 5 }),
      advancedAnswer('Containing something dangerous with a prepared technique or seal.', { barrier: 5 }),
      advancedAnswer('Building the plan that makes several specialists work as one unit.', { tactician: 5 }),
    ]),
    advancedQuestion('specialty-3', 'Focus', 'Where does your attention naturally go?', [
      advancedAnswer('Tracks, patterns, changes in terrain, and where people have been.', { tracker: 5 }),
      advancedAnswer('The condition and capabilities of the people around me.', { medic: 5 }),
      advancedAnswer('Signals that reveal something hidden or approaching.', { sensor: 5 }),
      advancedAnswer('The most dangerous individual on the field.', { duelist: 5 }),
    ]),
    advancedQuestion('specialty-4', 'Preparation', 'You have an hour before a difficult mission. What do you prepare?', [
      advancedAnswer('Routes, likely trails, and ways to avoid losing the target.', { tracker: 5 }),
      advancedAnswer('Medical supplies, recovery options, and contingency care.', { medic: 5 }),
      advancedAnswer('Entry identities, cover story, access points, and exit routes.', { infiltrator: 5 }),
      advancedAnswer('Maps, roles, contingencies, timing, and communication rules.', { tactician: 5 }),
    ]),
    advancedQuestion('specialty-5', 'Conflict', 'If a direct confrontation becomes unavoidable, what role fits you best?', [
      advancedAnswer('Keep track of movement so nobody escapes or flanks the squad.', { tracker: 4, sensor: 2 }),
      advancedAnswer('Keep allies functioning while reducing preventable losses.', { medic: 5 }),
      advancedAnswer('Take responsibility for the strongest individual threat.', { duelist: 5 }),
      advancedAnswer('Control space with barriers, traps, or containment.', { barrier: 5 }),
    ]),
    advancedQuestion('specialty-6', 'Success', 'Which success would make you proudest?', [
      advancedAnswer('Finding a target everyone else believed was impossible to locate.', { tracker: 5 }),
      advancedAnswer('Bringing everyone home from a mission that should have gone much worse.', { medic: 5 }),
      advancedAnswer('Completing the objective without the opposition ever understanding how.', { infiltrator: 5 }),
      advancedAnswer('Designing a plan where every teammate’s strength matters.', { tactician: 5 }),
    ]),
    advancedQuestion('specialty-7', 'Knowledge', 'What type of knowledge would you study deepest?', [
      advancedAnswer('Behavior, trails, terrain, and pursuit.', { tracker: 5 }),
      advancedAnswer('Anatomy, chakra pathways, recovery, and precision control.', { medic: 5 }),
      advancedAnswer('Detection ranges, signatures, concealment, and information networks.', { sensor: 5 }),
      advancedAnswer('Seals, barriers, containment rules, and prepared formations.', { barrier: 5 }),
    ]),
    advancedQuestion('specialty-8', 'Independence', 'Which specialty would you trust yourself to perform alone?', [
      advancedAnswer('Follow a difficult target over a long distance.', { tracker: 5 }),
      advancedAnswer('Blend into an unfamiliar environment and quietly complete an objective.', { infiltrator: 5 }),
      advancedAnswer('Handle a dangerous opponent one-on-one.', { duelist: 5 }),
      advancedAnswer('Analyze a complicated situation and build the most efficient response.', { tactician: 5 }),
    ]),
    advancedQuestion('specialty-9', 'Pressure', 'What happens to you when the mission becomes chaotic?', [
      advancedAnswer('I start looking for the trail or pattern that still makes sense.', { tracker: 4, sensor: 2 }),
      advancedAnswer('I prioritize whoever is most at risk and stabilize the situation.', { medic: 5 }),
      advancedAnswer('I reduce my visibility and look for a quiet route to the objective.', { infiltrator: 5 }),
      advancedAnswer('I simplify the situation into priorities, roles, and timing.', { tactician: 5 }),
    ]),
    advancedQuestion('specialty-10', 'Elite', 'What would make you elite in your field?', [
      advancedAnswer('I can find almost anyone from almost nothing.', { tracker: 5 }),
      advancedAnswer('I can keep people alive and effective under extreme pressure.', { medic: 5 }),
      advancedAnswer('I can identify threats before anyone else knows they exist.', { sensor: 5 }),
      advancedAnswer('I can either neutralize the key opponent or contain the entire encounter depending on what is needed.', { duelist: 3, barrier: 3, tactician: 1 }),
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
    advancedOutcome('assault', 'Vanguard', '攻', 'You create momentum by applying pressure and breaking through the point holding the squad back.'),
    advancedOutcome('recon', 'Recon', '偵', 'You create safety through information, scouting, tracking, and reducing surprises before the team commits.'),
    advancedOutcome('support', 'Support', '援', 'You amplify everyone else through recovery, utility, coordination, and creating openings.'),
    advancedOutcome('defense', 'Defender', '守', 'You stabilize the squad by absorbing pressure, protecting key people, and preventing collapse.'),
    advancedOutcome('control', 'Controller', '制', 'You shape positioning, tempo, terrain, and enemy choices so the squad fights on favorable terms.'),
    advancedOutcome('wildcard', 'Wildcard', '変', 'You are most valuable when roles break down and someone needs to become whatever the mission suddenly requires.'),
  ],
  [
    advancedQuestion('role-1', 'Start', 'Your squad reaches an unknown objective area. Where do you naturally contribute first?', [
      advancedAnswer('Take the lead position and be ready to create an opening.', { assault: 5 }),
      advancedAnswer('Scout routes, threats, and exits before the team commits.', { recon: 5 }),
      advancedAnswer('Check what everyone needs and prepare utility around the plan.', { support: 5 }),
      advancedAnswer('Choose a position that protects the team if contact goes badly.', { defense: 5 }),
    ]),
    advancedQuestion('role-2', 'Pressure', 'The squad is losing momentum. What do you do?', [
      advancedAnswer('Increase pressure and force something to change.', { assault: 5 }),
      advancedAnswer('Find the information we are missing before anyone commits harder.', { recon: 5 }),
      advancedAnswer('Create an opening or recovery window for the person best positioned to act.', { support: 5 }),
      advancedAnswer('Change the spacing or terrain so the opposition cannot keep dictating the encounter.', { control: 5 }),
    ]),
    advancedQuestion('role-3', 'Failure', 'A teammate can no longer perform their assigned role. Your instinct?', [
      advancedAnswer('Keep driving the objective so the team does not stall.', { assault: 4, wildcard: 2 }),
      advancedAnswer('Update the team with what the change means for threats and routes.', { recon: 5 }),
      advancedAnswer('Take care of the teammate and help redistribute their workload.', { support: 5 }),
      advancedAnswer('Fill the missing role myself until the squad can reorganize.', { wildcard: 5 }),
    ]),
    advancedQuestion('role-4', 'Value', 'What does a strong team need most from you?', [
      advancedAnswer('Someone willing to commit first when hesitation becomes costly.', { assault: 5 }),
      advancedAnswer('Reliable information before important decisions.', { recon: 5 }),
      advancedAnswer('Consistency that keeps people effective over the whole mission.', { support: 5 }),
      advancedAnswer('A stable anchor that prevents one bad moment from becoming a collapse.', { defense: 5 }),
    ]),
    advancedQuestion('role-5', 'Position', 'Where would you rather be during a complicated encounter?', [
      advancedAnswer('At the point where the main resistance has to break.', { assault: 5 }),
      advancedAnswer('At an angle where I can see what the rest of the team cannot.', { recon: 5 }),
      advancedAnswer('Near enough to reach whoever needs help next.', { support: 5 }),
      advancedAnswer('At the position that controls the most important routes and space.', { control: 5 }),
    ]),
    advancedQuestion('role-6', 'Protection', 'A high-value teammate becomes the focus of the opposition. What do you do?', [
      advancedAnswer('Pressure the opponent hard enough that they cannot stay focused on the target.', { assault: 5 }),
      advancedAnswer('Identify who is coordinating the pressure and how they are getting information.', { recon: 5 }),
      advancedAnswer('Keep the teammate functional and create options for escape or recovery.', { support: 5 }),
      advancedAnswer('Put myself between the threat and the teammate and hold the position.', { defense: 5 }),
    ]),
    advancedQuestion('role-7', 'Planning', 'Which part of planning interests you most?', [
      advancedAnswer('Where and when the team should commit force.', { assault: 4, control: 1 }),
      advancedAnswer('What we need to know before the mission begins.', { recon: 5 }),
      advancedAnswer('What resources and contingencies keep the team effective.', { support: 5 }),
      advancedAnswer('How to shape routes, spacing, traps, and fallback positions.', { control: 5, defense: 1 }),
    ]),
    advancedQuestion('role-8', 'Chaos', 'Everything changes at once. What happens to your role?', [
      advancedAnswer('I keep a clear direction and create forward momentum.', { assault: 4, defense: 1 }),
      advancedAnswer('I search for the new piece of information that explains the change.', { recon: 5 }),
      advancedAnswer('I stabilize whoever is becoming the weakest link.', { support: 5, defense: 1 }),
      advancedAnswer('I become whatever role is suddenly missing.', { wildcard: 5 }),
    ]),
    advancedQuestion('role-9', 'Reputation', 'Which squad reputation sounds best?', [
      advancedAnswer('The one who breaks stalemates.', { assault: 5 }),
      advancedAnswer('The one who rarely gets surprised.', { recon: 5 }),
      advancedAnswer('The one everyone performs better beside.', { support: 5 }),
      advancedAnswer('The one who makes the entire field easier for the team to manage.', { control: 5 }),
    ]),
    advancedQuestion('role-10', 'Peak', 'At your best, what does your team notice?', [
      advancedAnswer('I create the moment everyone else can capitalize on.', { assault: 5 }),
      advancedAnswer('I saw the problem before it reached them.', { recon: 5 }),
      advancedAnswer('I kept the mission from falling apart when pressure hit.', { defense: 4, support: 2 }),
      advancedAnswer('I smoothly changed roles every time the mission demanded something different.', { wildcard: 5, control: 1 }),
    ]),
  ],
);

// ===== QUIZ REGISTRY / NORMALIZATION =====
/**
 * Quiz contract: every rendered question has exactly four distinct answers.
 * Older core tests were originally authored with 5–8 valid choices per question.
 * We keep those choices in their source banks, then select a deterministic rotating
 * set of four so each run remains readable without permanently deleting outcomes.
 */
function fourDistinctAnswers(answers: Answer[], questionIndex: number): Answer[] {
  const unique = answers.filter((item, index, all) =>
    item.text.trim().length > 0 && all.findIndex((candidate) => candidate.text.trim().toLowerCase() === item.text.trim().toLowerCase()) === index,
  );

  if (unique.length < 4) {
    throw new Error(`Quiz data error: question has only ${unique.length} distinct answer options.`);
  }

  if (unique.length === 4) return unique;

  const start = (questionIndex * 3) % unique.length;
  return Array.from({ length: 4 }, (_, offset) => unique[(start + offset) % unique.length]);
}

function normalizeTest(test: TestDefinition): TestDefinition {
  const questions: Question[] = test.questions.map((item, index) => ({
    ...item,
    prompt: item.prompt.trim(),
    answers: fourDistinctAnswers(item.answers, index),
  }));

  return {
    ...test,
    questionCount: questions.length,
    questions,
    lengths: test.lengths
      ? {
          short: Math.min(test.lengths.short, questions.length),
          medium: Math.min(test.lengths.medium, questions.length),
          long: Math.min(test.lengths.long, questions.length),
        }
      : undefined,
  };
}

const rawTests: Record<TestId, TestDefinition> = {
  clan: clanTest,
  village: villageTest,
  mentor: mentorTest,
  rogue: rogueTest,
  chakra: chakraTest,
  summon: summonTest,
  fighting: fightingTest,
  weapon: weaponTest,
  leadership: leadershipTest,
  rank: rankTest,
  inherited: inheritedTest,
  specialty: specialtyTest,
  teamRole: teamRoleTest,
};

export const tests: Record<TestId, TestDefinition> = Object.fromEntries(
  Object.entries(rawTests).map(([id, test]) => [id, normalizeTest(test)]),
) as Record<TestId, TestDefinition>;

export const testOrder: TestId[] = ['clan', 'village', 'chakra', 'summon', 'mentor', 'rogue', 'fighting', 'weapon', 'leadership', 'rank', 'inherited', 'specialty', 'teamRole'];
export const coreTests: TestId[] = ['clan', 'village', 'chakra', 'summon', 'mentor', 'rogue'];
export const advancedTests: TestId[] = ['fighting', 'weapon', 'leadership', 'rank', 'inherited', 'specialty', 'teamRole'];
