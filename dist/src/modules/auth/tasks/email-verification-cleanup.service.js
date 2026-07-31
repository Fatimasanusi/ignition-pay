"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationCleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const email_verification_token_entity_1 = require("../entities/email-verification-token.entity");
let EmailVerificationCleanupService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handleCron_decorators;
    var EmailVerificationCleanupService = _classThis = class {
        constructor(tokenRepository) {
            this.tokenRepository = (__runInitializers(this, _instanceExtraInitializers), tokenRepository);
            this.logger = new common_1.Logger(EmailVerificationCleanupService.name);
        }
        /**
         * Cron job running daily at midnight to prune expired or used verification tokens.
         */
        async handleCron() {
            this.logger.log('Starting email verification token cleanup job...');
            const now = new Date();
            try {
                // Deletes tokens that either have a usedAt date OR whose expiresAt timestamp is in the past
                const result = await this.tokenRepository
                    .createQueryBuilder()
                    .delete()
                    .from(email_verification_token_entity_1.EmailVerificationToken)
                    .where('usedAt IS NOT NULL')
                    .orWhere('expiresAt < :now', { now })
                    .execute();
                const deletedCount = result.affected ?? 0;
                this.logger.log(`Successfully pruned ${deletedCount} expired/used email verification tokens.`);
                return deletedCount;
            }
            catch (error) {
                this.logger.error('Failed to cleanup email verification tokens', error);
                throw error;
            }
        }
    };
    __setFunctionName(_classThis, "EmailVerificationCleanupService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _handleCron_decorators = [(0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT)];
        __esDecorate(_classThis, null, _handleCron_decorators, { kind: "method", name: "handleCron", static: false, private: false, access: { has: obj => "handleCron" in obj, get: obj => obj.handleCron }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EmailVerificationCleanupService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EmailVerificationCleanupService = _classThis;
})();
exports.EmailVerificationCleanupService = EmailVerificationCleanupService;
