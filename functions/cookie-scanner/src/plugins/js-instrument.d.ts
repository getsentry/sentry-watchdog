declare global {
    interface Object {
        getPropertyDescriptor(subject: any, name: any): PropertyDescriptor;
    }
    interface Object {
        getPropertyNames(subject: any): string[];
    }
}
interface LogSettings {
    propertiesToInstrument?: string[];
    excludedProperties?: string[];
    logCallStack?: boolean;
    logFunctionsAsStrings?: boolean;
    preventSets?: boolean;
    recursive?: boolean;
    depth?: number;
}
export declare function jsInstruments(loggerHandler: any, StackTrace: any): {
    instrumentFunctionViaProxy: (object: any, objectName: string, property: string) => any;
    instrumentObject: (object: any, objectName: any, logSettings?: LogSettings) => void;
    instrumentObjectProperty: (object: any, objectName: any, propertyName: any, logSettings?: LogSettings) => void;
};
export {};
