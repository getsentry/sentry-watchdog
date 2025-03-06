"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentBtoa = void 0;
function instrumentBtoa({ instrumentFunctionViaProxy }) {
    window.btoa = instrumentFunctionViaProxy(window, 'window', 'btoa');
}
exports.instrumentBtoa = instrumentBtoa;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnRvYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJ0b2EudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsU0FBZ0IsY0FBYyxDQUFDLEVBQUUsMEJBQTBCLEVBQUU7SUFDekQsTUFBTSxDQUFDLElBQUksR0FBRywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZFLENBQUM7QUFGRCx3Q0FFQyJ9