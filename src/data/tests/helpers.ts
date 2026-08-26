import type {Answer,Outcome} from '../../types/quiz';
export const answer=(text:string,scores:Record<string,number>):Answer=>({text,scores});
export const outcome=(id:string,symbol:string,description:string,extra:Partial<Outcome>={}):Outcome=>({id,label:id,symbol,description,...extra});
