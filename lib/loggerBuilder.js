"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fhir_works_on_aws_interface_1 = require("fhir-works-on-aws-interface");
const componentLogger = (0, fhir_works_on_aws_interface_1.makeLogger)({
    component: 'auth-smart',
});
function getComponentLogger() {
    return componentLogger;
}
exports.default = getComponentLogger;
//# sourceMappingURL=loggerBuilder.js.map