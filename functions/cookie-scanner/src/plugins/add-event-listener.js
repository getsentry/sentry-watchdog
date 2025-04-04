"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentAddEventListener = void 0;
function instrumentAddEventListener({ instrumentFunctionViaProxy }) {
    document.addEventListener = instrumentFunctionViaProxy(document, 'document', 'addEventListener');
    window.addEventListener = instrumentFunctionViaProxy(window, 'window', 'addEventListener');
}
exports.instrumentAddEventListener = instrumentAddEventListener;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLWV2ZW50LWxpc3RlbmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYWRkLWV2ZW50LWxpc3RlbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLFNBQWdCLDBCQUEwQixDQUFDLEVBQUUsMEJBQTBCLEVBQUU7SUFDckUsUUFBUSxDQUFDLGdCQUFnQixHQUFHLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUNqRyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsMEJBQTBCLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0FBQy9GLENBQUM7QUFIRCxnRUFHQyJ9