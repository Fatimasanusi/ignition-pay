"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycService = void 0;
const common_1 = require("@nestjs/common");
const user_entity_1 = require("../users/entities/user.entity");
const kyc_audit_log_entity_1 = require("./entities/kyc-audit-log.entity");
let KycService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var KycService = _classThis = class {
        constructor(userRepository, auditLogRepository, dataSource) {
            this.userRepository = userRepository;
            this.auditLogRepository = auditLogRepository;
            this.dataSource = dataSource;
            this.logger = new common_1.Logger(KycService.name);
        }
        /**
         * Processes verified KYC webhook: updates user status and records audit log in a transaction
         */
        async processWebhook(payload) {
            const { userId, applicantId, status, reason, metadata } = payload;
            await this.dataSource.transaction(async (manager) => {
                const user = await manager.findOne(user_entity_1.User, { where: { id: userId } });
                if (!user) {
                    throw new common_1.NotFoundException(`User with ID ${userId} not found`);
                }
                const previousStatus = user.kycStatus;
                // Update User KYC Status
                user.kycStatus = status;
                await manager.save(user_entity_1.User, user);
                // Create Audit Log Entry
                const auditLog = manager.create(kyc_audit_log_entity_1.KycAuditLog, {
                    userId,
                    applicantId,
                    previousStatus,
                    newStatus: status,
                    reason: reason ?? null,
                    metadata: metadata ?? null,
                });
                await manager.save(kyc_audit_log_entity_1.KycAuditLog, auditLog);
                this.logger.log(`KYC status for user ${userId} updated from ${previousStatus} to ${status}`);
            });
        }
    };
    __setFunctionName(_classThis, "KycService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        KycService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return KycService = _classThis;
})();
exports.KycService = KycService;
