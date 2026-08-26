#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec, Map};
use crate::MultiOracleContractClient;
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
}

#[contract]
pub struct MultiOracleContract;

#[contractimpl]
impl MultiOracleContract {
    pub fn initialize(env: Env, admin: Address, oracles: Vec<Address>) {
        let admin_key = "admin";
        let oracles_key = "oracles";

        if env.storage().instance().has(&admin_key) {
            panic!("Contract already initialized");
        }

        env.storage().instance().set(&admin_key, &admin);
        env.storage().instance().set(&oracles_key, &oracles);
        env.storage().instance().set(&"prices", &Map::<Symbol, Vec<u64>>::new(&env));
    }

    pub fn add_oracle(&self, env: &Env, new_oracle: Address) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut oracles: Vec<Address> = env.storage().instance().get(&"oracles").unwrap_or_else(|| Vec::new(env));
        oracles.push_back(new_oracle);
        env.storage().instance().set(&"oracles", &oracles);
    }

    pub fn remove_oracle(&self, env: &Env, oracle_to_remove: Address) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut oracles: Vec<Address> = env.storage().instance().get(&"oracles").unwrap_or_else(|| Vec::new(env));
        if let Some(index) = oracles.iter().position(|o| o == oracle_to_remove) {
            oracles.remove(index as u32);
        }
        env.storage().instance().set(&"oracles", &oracles);
    }

    pub fn push_price(&self, env: &Env, asset: Symbol, price: u64) {
        let caller = env.invoker();
        let oracles: Vec<Address> = env.storage().instance().get(&"oracles").unwrap_or_else(|| Vec::new(env));

        if !oracles.contains(&caller) {
            panic!("Caller is not a registered oracle");
        }

        let mut prices: Map<Symbol, Vec<u64>> = env.storage().instance().get(&"prices").unwrap_or_else(|| Map::new(env));
        let mut asset_prices = prices.get(asset.clone()).unwrap_or_else(|| Vec::new(env));
        
        asset_prices.push_back(price);
        prices.set(asset.clone(), asset_prices);
        env.storage().instance().set(&"prices", &prices);
    }

    pub fn get_median_price(&self, env: &Env, asset: Symbol) -> u64 {
        let prices: Map<Symbol, Vec<u64>> = env.storage().instance().get(&"prices").unwrap_or_else(|| Map::new(env));
        let mut asset_prices = prices.get(asset.clone()).unwrap_or_else(|| panic!("No prices for asset"));

        if asset_prices.is_empty() {
            panic!("No prices available for this asset");
        }

        asset_prices.sort();
        let mid = asset_prices.len() / 2;
        asset_prices.get(mid).unwrap_or(0)
    }
}

#[contract]
pub struct PriceFeedContract;

#[contractimpl]
impl PriceFeedContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&"admin") {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&"admin", &admin);
        env.storage().instance().set(&"providers", &Vec::<Address>::new(&env));
    }

    pub fn register_provider(&self, env: &Env, provider: Address) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut providers: Vec<Address> = env.storage().instance().get(&"providers").unwrap_or_else(|| Vec::new(env));
        if providers.contains(&provider) {
            panic!("Provider already registered");
        }
        providers.push_back(provider);
        env.storage().instance().set(&"providers", &providers);
    }

    pub fn unregister_provider(&self, env: &Env, provider: Address) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut providers: Vec<Address> = env.storage().instance().get(&"providers").unwrap_or_else(|| Vec::new(env));
        if let Some(index) = providers.iter().position(|p| p == provider) {
            providers.remove(index as u32);
        }
        env.storage().instance().set(&"providers", &providers);
    }

    pub fn update_price(&self, env: &Env, multi_oracle_contract: Address, asset: Symbol, price: u64) {
        let caller = env.invoker();
        let providers: Vec<Address> = env.storage().instance().get(&"providers").unwrap_or_else(|| Vec::new(env));

        if !providers.contains(&caller) {
            panic!("Caller is not a registered provider");
        }

        let oracle_client = MultiOracleContractClient::new(env, &multi_oracle_contract);
        oracle_client.push_price(&asset, &price);
    }
}

#[contract]
pub struct AccessControlContract;

#[contractimpl]
impl AccessControlContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&"admin") {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&"admin", &admin);
        env.storage().instance().set(&"operators", &Vec::<Address>::new(&env));
    }

    pub fn has_admin_role(&self, env: &Env, user: &Address) -> bool {
        let admin: Address = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        &admin == user
    }

    pub fn has_operator_role(&self, env: &Env, user: &Address) -> bool {
        let operators: Vec<Address> = env.storage().instance().get(&"operators").unwrap_or_else(|| Vec::new(env));
        operators.contains(user)
    }

    pub fn add_operator(&self, env: &Env, operator: Address) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut operators: Vec<Address> = env.storage().instance().get(&"operators").unwrap_or_else(|| Vec::new(env));
        if operators.contains(&operator) {
            panic!("Operator already exists");
        }
        operators.push_back(operator);
        env.storage().instance().set(&"operators", &operators);
    }

    pub fn remove_operator(&self, env: &Env, operator: Address) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut operators: Vec<Address> = env.storage().instance().get(&"operators").unwrap_or_else(|| Vec::new(env));
        if let Some(index) = operators.iter().position(|o| o == operator) {
            operators.remove(index as u32);
        }
        env.storage().instance().set(&"operators", &operators);
    }
}


#[contract]
pub struct PausableContract;

#[contractimpl]
impl PausableContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&"admin") {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&"admin", &admin);
        env.storage().instance().set(&"paused", &false);
    }

    pub fn is_paused(&self, env: &Env) -> bool {
        env.storage().instance().get(&"paused").unwrap_or(false)
    }

    pub fn pause(&self, env: &Env) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        env.storage().instance().set(&"paused", &true);
    }

    pub fn unpause(&self, env: &Env) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        env.storage().instance().set(&"paused", &false);
    }
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
