"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsInstruments = jsInstruments;
function jsInstruments(loggerHandler, StackTrace) {
    let inLog = false;
    const sendMessagesToLogger = (msg) => {
        if (inLog) {
            return;
        }
        loggerHandler(msg);
        inLog = false;
    };
    const instrumentFunctionViaProxy = function (object, objectName, property) {
        return new Proxy(object[property], {
            apply(target, thisValue, args) {
                const stack = StackTrace.getSync({ offline: true });
                sendMessagesToLogger({
                    data: {
                        operation: 'call',
                        symbol: `${objectName}.${property}`,
                        value: serializeObject(args, true)
                    },
                    stack,
                    type: 'JsInstrument.FunctionProxy',
                    url: window.location.href
                });
                return target.call(thisValue, ...args);
            }
        });
    };
    // Recursively generates a path for an element
    const getPathToDomElement = function (element, visibilityAttr = false) {
        if (element === document.body) {
            return element.tagName;
        }
        if (element.parentNode === null) {
            return 'NULL/' + element.tagName;
        }
        let siblingIndex = 1;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                let path = getPathToDomElement(element.parentNode, visibilityAttr);
                path += '/' + element.tagName + '[' + siblingIndex;
                path += ',' + element.id;
                path += ',' + element.className;
                if (visibilityAttr) {
                    path += ',' + element.hidden;
                    path += ',' + element.style.display;
                    path += ',' + element.style.visibility;
                }
                if (element.tagName === 'A') {
                    path += ',' + element.href;
                }
                path += ']';
                return path;
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                siblingIndex++;
            }
        }
    };
    const serializeObject = function (object, stringifyFunctions = false) {
        // Handle permissions errors
        try {
            if (object === null) {
                return 'null';
            }
            if (typeof object === 'function') {
                if (stringifyFunctions) {
                    return object.toString();
                }
                else {
                    return 'FUNCTION';
                }
            }
            if (typeof object !== 'object') {
                return object;
            }
            const seenObjects = [];
            return JSON.stringify(object, function (key, value) {
                if (value === null) {
                    return 'null';
                }
                if (typeof value === 'function') {
                    if (stringifyFunctions) {
                        return value.toString();
                    }
                    else {
                        return 'FUNCTION';
                    }
                }
                if (typeof value === 'object') {
                    // Remove wrapping on content objects
                    if ('wrappedJSObject' in value) {
                        value = value.wrappedJSObject;
                    }
                    // Serialize DOM elements
                    if (value instanceof HTMLElement) {
                        return getPathToDomElement(value);
                    }
                    // Prevent serialization cycles
                    if (key === '' || seenObjects.indexOf(value) < 0) {
                        seenObjects.push(value);
                        return value;
                    }
                    else {
                        return typeof value;
                    }
                }
                return value;
            });
        }
        catch (error) {
            sendMessagesToLogger({
                data: {
                    message: `Serialization error: ${error}`
                },
                stack: [],
                type: 'Error.JsInstrument',
                url: window.location.href
            });
            return 'Serialization error: ' + error;
        }
    };
    Object.getPropertyDescriptor = function (subject, name) {
        let pd = Object.getOwnPropertyDescriptor(subject, name);
        let proto = Object.getPrototypeOf(subject);
        while (pd === undefined && proto !== null) {
            pd = Object.getOwnPropertyDescriptor(proto, name);
            proto = Object.getPrototypeOf(proto);
        }
        return pd ? pd : {};
    };
    Object.getPropertyNames = function (subject) {
        let props = Object.getOwnPropertyNames(subject);
        let proto = Object.getPrototypeOf(subject);
        while (proto !== null) {
            props = props.concat(Object.getOwnPropertyNames(proto));
            proto = Object.getPrototypeOf(proto);
        }
        // FIXME: remove duplicate property names from props
        return props;
    };
    const isObject = function (object, propertyName) {
        let property;
        try {
            property = object[propertyName];
        }
        catch (error) {
            return false;
        }
        if (property === null) {
            // null is type "object"
            return false;
        }
        return typeof property === 'object';
    };
    const instrumentFunction = function (objectName, methodName, func, serialize = false) {
        return function () {
            const stack = StackTrace.getSync({ offline: true });
            const args = Array.prototype.slice.call(arguments, 0);
            const serialArgs = args.map(arg => serializeObject(arg, serialize));
            const returnValue = func.apply(this, arguments);
            sendMessagesToLogger({
                data: {
                    arguments: serialArgs,
                    operation: 'call',
                    symbol: `${objectName}.${methodName}`,
                    value: serializeObject(returnValue, true)
                },
                stack,
                type: 'JsInstrument.Function',
                url: window.location.href
            });
            return returnValue;
        };
    };
    const instrumentObjectProperty = function (object, objectName, propertyName, logSettings = {}) {
        const origDescriptor = Object.getPropertyDescriptor(object, propertyName);
        if (!origDescriptor) {
            sendMessagesToLogger({
                data: {
                    message: 'Property descriptor not found for',
                    object,
                    objectName,
                    propertyName
                },
                stack: [],
                type: 'Error.JsInstrument',
                url: window.location.href
            });
            return;
        }
        const origGetter = origDescriptor.get;
        const origSetter = origDescriptor.set;
        let originalValue = origDescriptor.value;
        Object.defineProperty(object, propertyName, {
            configurable: true,
            get() {
                let origProperty;
                const stack = StackTrace.getSync({ offline: true });
                if (origGetter) {
                    // if accessor property
                    origProperty = origGetter.call(this);
                }
                else if ('value' in origDescriptor) {
                    // if data property
                    origProperty = originalValue;
                }
                else {
                    console.error(`Property descriptor for ${objectName}.${propertyName} doesn't have getter or value?`);
                    sendMessagesToLogger({
                        data: {
                            logSettings,
                            operation: 'get(failed)',
                            symbol: objectName + '.' + propertyName,
                            value: ''
                        },
                        stack,
                        type: 'JsInstrument.ObjectProperty',
                        url: window.location.href
                    });
                    return;
                }
                // Log `gets` except those that have instrumented return values
                // * All returned functions are instrumented with a wrapper
                // * Returned objects may be instrumented if recursive
                //   instrumentation is enabled and this isn't at the depth limit.
                if (typeof origProperty === 'function') {
                    return instrumentFunction(objectName, propertyName, origProperty);
                }
                else if (typeof origProperty === 'object' && !!logSettings.recursive && (!('depth' in logSettings) || logSettings.depth > 0)) {
                    return origProperty;
                }
                else {
                    sendMessagesToLogger({
                        data: {
                            operation: 'get',
                            symbol: `${objectName}.${propertyName}`,
                            value: serializeObject(origProperty)
                        },
                        stack,
                        type: 'JsInstrument.ObjectProperty',
                        url: window.location.href
                    });
                    return origProperty;
                }
            },
            set(value) {
                let returnValue;
                const stack = StackTrace.getSync({ offline: true });
                // Prevent sets for functions and objects if enabled
                if (!!logSettings.preventSets && (typeof originalValue === 'function' || typeof originalValue === 'object')) {
                    sendMessagesToLogger({
                        data: {
                            operation: 'set(prevented)',
                            symbol: `${objectName}.${propertyName}`,
                            value: serializeObject(value)
                        },
                        stack,
                        type: 'JsInstrument.ObjectProperty',
                        url: window.location.href
                    });
                    return value;
                }
                if (origSetter) {
                    // if accessor property
                    returnValue = origSetter.call(this, value);
                }
                else if ('value' in origDescriptor) {
                    inLog = true;
                    if (object.isPrototypeOf(this)) {
                        Object.defineProperty(this, propertyName, {
                            value
                        });
                    }
                    else {
                        originalValue = value;
                    }
                    returnValue = value;
                    inLog = false;
                }
                else {
                    sendMessagesToLogger({
                        data: {
                            message: `Property descriptor for, ${objectName}.${propertyName}, doesn't have setter or value?`
                        },
                        stack,
                        type: 'Error.JsInstrument',
                        url: window.location.href
                    });
                    return value;
                }
                sendMessagesToLogger({
                    data: {
                        operation: 'set',
                        symbol: `${objectName}.${propertyName}`,
                        value: serializeObject(value)
                    },
                    stack,
                    type: 'JsInstrument.ObjectProperty',
                    url: window.location.href
                });
                return returnValue;
            }
        });
    };
    const instrumentObject = function (object, objectName, logSettings = {}) {
        // sendMessagesToLogger({ type: "JsInstrument.Debug", message: !!logSettings.recursive });
        const properties = Object.getPropertyNames(object);
        for (const property of properties) {
            if (logSettings.excludedProperties && logSettings.excludedProperties.indexOf(property) > -1) {
                continue;
            }
            // console.log("observing", property);
            // If `recursive` flag set we want to recursively instrument any
            // object properties that aren't the prototype object. Only recurse if
            // depth not set (at which point its set to default) or not at limit.
            if (!!logSettings.recursive &&
                property !== '__proto__' &&
                isObject(object, property) &&
                (!('depth' in logSettings) || logSettings.depth > 0)) {
                if (!('depth' in logSettings)) {
                    logSettings.depth = 5;
                }
                instrumentObject(object[property], `${objectName}.${property}`, {
                    depth: logSettings.depth - 1,
                    preventSets: logSettings.preventSets,
                    recursive: logSettings.recursive
                });
            }
            try {
                instrumentObjectProperty(object, objectName, property, logSettings);
            }
            catch (error) {
                sendMessagesToLogger({
                    data: {
                        message: error
                    },
                    stack: [],
                    type: 'Error.JsInstrument',
                    url: window.location.href
                });
                console.error(error);
            }
        }
    };
    return {
        instrumentFunctionViaProxy,
        instrumentObject,
        instrumentObjectProperty
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianMtaW5zdHJ1bWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImpzLWluc3RydW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFvQkEsc0NBNlZDO0FBN1ZELFNBQWdCLGFBQWEsQ0FBQyxhQUFhLEVBQUUsVUFBVTtJQUNuRCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDbEIsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLEdBQW9CLEVBQUUsRUFBRTtRQUNsRCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1IsT0FBTztRQUNYLENBQUM7UUFDRCxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkIsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNsQixDQUFDLENBQUM7SUFDRixNQUFNLDBCQUEwQixHQUFHLFVBQVUsTUFBVyxFQUFFLFVBQWtCLEVBQUUsUUFBZ0I7UUFDMUYsT0FBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDL0IsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSTtnQkFDekIsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRCxvQkFBb0IsQ0FBQztvQkFDakIsSUFBSSxFQUFFO3dCQUNGLFNBQVMsRUFBRSxNQUFNO3dCQUNqQixNQUFNLEVBQUUsR0FBRyxVQUFVLElBQUksUUFBUSxFQUFFO3dCQUNuQyxLQUFLLEVBQUUsZUFBZSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7cUJBQ3JDO29CQUNELEtBQUs7b0JBQ0wsSUFBSSxFQUFFLDRCQUE0QjtvQkFDbEMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSTtpQkFDNUIsQ0FBQyxDQUFDO2dCQUNILE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUMzQyxDQUFDO1NBQ0os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