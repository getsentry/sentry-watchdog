import { LinkObject } from '../types';
export declare const getLinks: (page: any) => Promise<LinkObject[]>;
export declare const dedupLinks: (links_with_duplicates: LinkObject[]) => LinkObject[];
export declare const getSocialLinks: (links: LinkObject[]) => LinkObject[];
