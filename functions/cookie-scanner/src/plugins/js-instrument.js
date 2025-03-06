"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsInstruments = void 0;
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
exports.jsInstruments = jsInstruments;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianMtaW5zdHJ1bWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImpzLWluc3RydW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBb0JBLFNBQWdCLGFBQWEsQ0FBQyxhQUFhLEVBQUUsVUFBVTtJQUNuRCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDbEIsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLEdBQW9CLEVBQUUsRUFBRTtRQUNsRCxJQUFJLEtBQUssRUFBRTtZQUNQLE9BQU87U0FDVjtRQUNELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQixLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLENBQUMsQ0FBQztJQUNGLE1BQU0sMEJBQTBCLEdBQUcsVUFBVSxNQUFXLEVBQUUsVUFBa0IsRUFBRSxRQUFnQjtRQUMxRixPQUFPLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMvQixLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJO2dCQUN6QixNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ3BELG9CQUFvQixDQUFDO29CQUNqQixJQUFJLEVBQUU7d0JBQ0YsU0FBUyxFQUFFLE1BQU07d0JBQ2pCLE1BQU0sRUFBRSxHQUFHLFVBQVUsSUFBSSxRQUFRLEVBQUU7d0JBQ25DLEtBQUssRUFBRSxlQUFlLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztxQkFDckM7b0JBQ0QsS0FBSztvQkFDTCxJQUFJLEVBQUUsNEJBQTRCO29CQUNsQyxHQUFHLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJO2lCQUM1QixDQUFDLENBQUM7Z0JBQ0gsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzNDLENBQUM7U0FDSixDQUFDLENBQUM7SUFDUCxDQUFDLENB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