#![no_std]
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Symbol, Vec, Map};

const MAX_CALLS_PER_LEDGER: u32 = 5;
const CONTRACT_VERSION: &str = "0.1.0";
const VERSION_KEY: &str = "contract_version";
const ADMIN_KEY: &str = "admin";
const AUTHORIZATIONS_KEY: &str = "authorizations";
const RATE_LIMIT_KEY: &str = "rate_limit";
const KYC_STATUS_KEY: &str = "kyc_status";
const PENDING_UPGRADE_KEY: &str = "pending_upgrade";

#[contract]
pub struct IgnitionPayContract;

#[contractimpl]
impl IgnitionPayContract {
    /// Initialize the contract with an admin address.
    /// This should be called exactly once after deployment.
    pub fn initialize(env: Env, admin: Address) {
        // Guard against re-initialization
        if env.storage().instance().has(&Symbol::new(&env, VERSION_KEY)) {
            panic!("Contract already initialized");
        }

        env.storage().instance().set(&Symbol::new(&env, ADMIN_KEY), &admin);
        env.storage().instance().set(&Symbol::new(&env, AUTHORIZATIONS_KEY), &Vec::<Address>::new(&env));
        env.storage().instance().set(&Symbol::new(&env, RATE_LIMIT_KEY), &Map::<Address, (u32, u32)>::new(&env));
        env.storage().instance().set(&Symbol::new(&env, KYC_STATUS_KEY), &Map::<Address, bool>::new(&env));
        env.storage().instance().set(&Symbol::new(&env, VERSION_KEY), &Symbol::new(&env, CONTRACT_VERSION));
    }

    fn check_rate_limit(&self, env: &Env, user: &Address) {
        let mut rate_limit: Map<Address, (u32, u32)> = env.storage().instance().get(&Symbol::new(&env, RATE_LIMIT_KEY)).unwrap_or_else(|| Map::new(env));
        let current_ledger = env.ledger().sequence();

        let (last_ledger, call_count) = rate_limit.get(user.clone()).unwrap_or((0, 0));

        if last_ledger == current_ledger {
            if call_count >= MAX_CALLS_PER_LEDGER {
                panic!("Rate limit exceeded");
            }
            rate_limit.set(user.clone(), (current_ledger, call_count + 1));
        } else {
            rate_limit.set(user.clone(), (current_ledger, 1));
        }

        env.storage().instance().set(&Symbol::new(&env, RATE_LIMIT_KEY), &rate_limit);
    }

    /// Set KYC status for a user. Only callable by admin.
    pub fn set_kyc_status(&self, env: &Env, user: &Address, kyc_completed: bool) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, ADMIN_KEY)).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        self.check_rate_limit(&env, &admin);

        let mut kyc_status: Map<Address, bool> = env.storage().instance().get(&Symbol::new(&env, KYC_STATUS_KEY)).unwrap_or_else(|| Map::new(env));
        kyc_status.set(user.clone(), kyc_completed);
        env.storage().instance().set(&Symbol::new(&env, KYC_STATUS_KEY), &kyc_status);
    }

    /// Authorize a user. Requires admin auth and KYC completion.
    pub fn authorize(env: Env, user: Address) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, ADMIN_KEY)).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        self.check_rate_limit(&env, &admin);

        let kyc_status: Map<Address, bool> = env.storage().instance().get(&Symbol::new(&env, KYC_STATUS_KEY)).unwrap_or_else(|| Map::new(&env));
        if !kyc_status.get(user.clone()).unwrap_or(false) {
            panic!("KYC not completed");
        }

        let mut authorizations: Vec<Address> = env.storage().instance().get(&Symbol::new(&env, AUTHORIZATIONS_KEY)).unwrap_or_else(|| Vec::new(&env));
        authorizations.push_back(user);
        env.storage().instance().set(&Symbol::new(&env, AUTHORIZATIONS_KEY), &authorizations);
    }

    /// Revoke authorization for a user. Only callable by admin.
    pub fn revoke(env: Env, user: Address) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, ADMIN_KEY)).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        self.check_rate_limit(&env, &admin);

        let mut authorizations: Vec<Address> = env.storage().instance().get(&Symbol::new(&env, AUTHORIZATIONS_KEY)).unwrap_or_else(|| Vec::new(&env));
        if let Some(index) = authorizations.iter().position(|a| a == user) {
            authorizations.remove(index as u32);
        }
        env.storage().instance().set(&Symbol::new(&env, AUTHORIZATIONS_KEY), &authorizations);
    }

    /// Check if a user is authorized.
    pub fn is_authorized(env: Env, user: Address) -> bool {
        let authorizations: Vec<Address> = env.storage().instance().get(&Symbol::new(&env, AUTHORIZATIONS_KEY)).unwrap_or_else(|| Vec::new(&env));
        authorizations.contains(&user)
    }

    /// Get the current contract version.
    pub fn version(env: Env) -> Symbol {
        env.storage().instance().get(&Symbol::new(&env, VERSION_KEY)).unwrap_or_else(|| panic!("Version not set"))
    }

    /// Initiate a contract upgrade. Only callable by admin.
    /// This stores the new WASM hash and creates a pending upgrade record.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, ADMIN_KEY)).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        // Store the pending upgrade
        env.storage().instance().set(&Symbol::new(&env, PENDING_UPGRADE_KEY), &new_wasm_hash);

        // Emit upgrade initiated event
        let topics = (Symbol::new(&env, "upgrade_initiated"), &admin);
        env.events().publish(topics, &new_wasm_hash);
    }

    /// Apply a pending upgrade. Only callable by admin.
    /// This actually performs the WASM upgrade using Soroban's built-in mechanism.
    pub fn apply_upgrade(env: Env) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, ADMIN_KEY)).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let new_wasm_hash: BytesN<32> = env.storage().instance().get(&Symbol::new(&env, PENDING_UPGRADE_KEY)).unwrap_or_else(|| panic!("No pending upgrade"));

        // Perform the actual upgrade using Soroban's upgradeable contract feature
        env.deployer().update_current_contract_wasm(new_wasm_hash.clone());

        // Update version - in production, parse and increment semver properly
        env.storage().instance().set(&Symbol::new(&env, VERSION_KEY), &Symbol::new(&env, "0.2.0"));

        // Clear pending upgrade
        env.storage().instance().remove(&Symbol::new(&env, PENDING_UPGRADE_KEY));

        // Emit upgrade applied event
        let topics = (Symbol::new(&env, "upgrade_applied"), &admin);
        env.events().publish(topics, &new_wasm_hash);
    }

    /// Check if there's a pending upgrade.
    pub fn has_pending_upgrade(env: Env) -> bool {
        env.storage().instance().has(&Symbol::new(&env, PENDING_UPGRADE_KEY))
    }

    /// Transfer admin role to a new address. Only callable by current admin.
    pub fn transfer_admin(env: Env, new_admin: Address) {
        let current_admin: Address = env.storage().instance().get(&Symbol::new(&env, ADMIN_KEY)).unwrap_or_else(|| panic!("Admin not set"));
        current_admin.require_auth();

        if current_admin == new_admin {
            panic!("New admin must be different from current admin");
        }

        env.storage().instance().set(&Symbol::new(&env, ADMIN_KEY), &new_admin);

        // Emit admin transfer event
        let topics = (Symbol::new(&env, "admin_transferred"), &current_admin);
        env.events().publish(topics, &new_admin);
    }
}
