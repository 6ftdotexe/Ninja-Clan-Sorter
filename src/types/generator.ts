export type PortraitMode='portrait'|'full-body'|'action'|'dossier';
export type PortraitQuality='medium'|'high';
export interface GeneratorOptions{mode:PortraitMode;quality:PortraitQuality;preserveHair:boolean;showSummon:boolean;showDojutsu:boolean}
export interface GeneratorRequest{photoDataUrl:string;prompt:string;mode:PortraitMode;quality:PortraitQuality}
export interface GeneratorResponse{imageDataUrl:string;requestId?:string;provider?:string;model?:string;appearanceDescription?:string;moderatedRetry?:boolean}
