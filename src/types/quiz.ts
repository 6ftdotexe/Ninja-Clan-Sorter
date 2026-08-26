export type TestId='clan'|'village'|'mentor'|'rogue'|'chakra'|'summon';
export type TestLength='short'|'medium'|'long';
export type ScoreMap=Record<string,number>;
export interface Answer { text:string; scores:ScoreMap }
export interface Question { id:string; theme:string; prompt:string; answers:Answer[] }
export interface Outcome { id:string; label:string; symbol:string; description:string; rarity?:number; traits?:string[]; strengths?:string[]; weaknesses?:string[]; specialty?:string; jutsu?:string[]; theme?:string }
export interface TestDefinition { id:TestId; label:string; shortLabel:string; icon:string; description:string; questionCount:number; lengths?:Record<TestLength,number>; questions:Question[]; outcomes:Record<string,Outcome> }
export interface TestResult { testId:TestId; winner:string; confidence:number; secondary?:string; advanced?:string; alternates:{id:string;percent:number}[]; meta?:Record<string,string|number|string[]> }
