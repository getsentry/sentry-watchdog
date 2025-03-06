/// <reference types="winston" />
export declare const getLogger: ({ outDir, quiet }: {
    outDir?: string;
    quiet?: boolean;
}) => import("winston").Logger;
