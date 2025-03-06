"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentNetworkRequestApis = void 0;
function instrumentNetworkRequestApis({ instrumentObject, instrumentFunctionViaProxy }) {
    window.fetch = instrumentFunctionViaProxy(window, 'window', 'fetch');
    instrumentObject(window.XMLHttpRequest.prototype, 'XMLHttpRequest');
}
exports.instrumentNetworkRequestApis = instrumentNetworkRequestApis;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieGhyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsieGhyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLFNBQWdCLDRCQUE0QixDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsMEJBQTBCLEVBQUU7SUFDekYsTUFBTSxDQUFDLEtBQUssR0FBRywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JFLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDeEUsQ0FBQztBQUhELG9FQUdDIn0=