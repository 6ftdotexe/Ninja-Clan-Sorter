export type PortraitMode='portrait'|'full-body'|'action'|'dossier';
export type GeneratorOptions={mode:PortraitMode;quality:'medium'|'high';preserveHair:boolean;showSummon:boolean;showDojutsu:boolean};
export type GeneratorRequest={photoDataUrl:string;prompt:string;mode:PortraitMode;quality:'medium'|'high'};
export type GeneratorResponse={imageDataUrl:string;provider?:string;model?:string;creditsUsed?:number;creditsRemaining?:number;generationId?:string};
