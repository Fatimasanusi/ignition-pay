#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Map, Symbol, Vec};
use crate::MultiOracleContractClient;

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
    pub fn authorize(&self, env: Env, user: Address) {
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
    pub fn revoke(&self, env: Env, user: Address) {
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

    pub fn version(env: Env) -> Symbol {
        env.storage().instance().get(&Symbol::new(&env, VERSION_KEY)).unwrap_or_else(|| panic!("Version not set"))
    }

    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, ADMIN_KEY)).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        env.storage().instance().set(&Symbol::new(&env, PENDING_UPGRADE_KEY), &new_wasm_hash);
        env.events().publish((Symbol::new(&env, "upgrade_initiated"), &admin), &new_wasm_hash);
    }

    pub fn apply_upgrade(env: Env) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, ADMIN_KEY)).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        let new_wasm_hash: BytesN<32> = env.storage().instance().get(&Symbol::new(&env, PENDING_UPGRADE_KEY)).unwrap_or_else(|| panic!("No pending upgrade"));
        env.deployer().update_current_contract_wasm(new_wasm_hash.clone());
        env.storage().instance().set(&Symbol::new(&env, VERSION_KEY), &Symbol::new(&env, "0.2.0"));
        env.storage().instance().remove(&Symbol::new(&env, PENDING_UPGRADE_KEY));
        env.events().publish((Symbol::new(&env, "upgrade_applied"), &admin), &new_wasm_hash);
    }

    pub fn has_pending_upgrade(env: Env) -> bool {
        env.storage().instance().has(&Symbol::new(&env, PENDING_UPGRADE_KEY))
    }

    pub fn transfer_admin(env: Env, new_admin: Address) {
        let current_admin: Address = env.storage().instance().get(&Symbol::new(&env, ADMIN_KEY)).unwrap_or_else(|| panic!("Admin not set"));
        current_admin.require_auth();
        if current_admin == new_admin {
            panic!("New admin must be different from current admin");
        }
        env.storage().instance().set(&Symbol::new(&env, ADMIN_KEY), &new_admin);
        env.events().publish((Symbol::new(&env, "admin_transferred"), &current_admin), &new_admin);
    }
}
#[contract]
pub struct AssetAllowlistContract;

#[contractimpl]
impl AssetAllowlistContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&Symbol::new(&env, "admin")) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().instance().set(&Symbol::new(&env, "assets"), &Map::<Address, bool>::new(&env));
    }

    pub fn add_asset(&self, env: &Env, asset: Address) {
        let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin")).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        let mut assets: Map<Address, bool> = env.storage().instance().get(&Symbol::new(env, "assets")).unwrap_or_else(|| Map::new(env));
        assets.set(asset, true);
        env.storage().instance().set(&Symbol::new(env, "assets"), &assets);
    }

    pub fn remove_asset(&self, env: &Env, asset: Address) {
        let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin")).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        let mut assets: Map<Address, bool> = env.storage().instance().get(&Symbol::new(env, "assets")).unwrap_or_else(|| Map::new(env));
        assets.set(asset, false);
        env.storage().instance().set(&Symbol::new(env, "assets"), &assets);
    }

    pub fn is_asset_allowed(env: Env, asset: Address) -> bool {
        let assets: Map<Address, bool> = env.storage().instance().get(&Symbol::new(&env, "assets")).unwrap_or_else(|| Map::new(&env));
        assets.get(asset).unwrap_or(false)
    }
}

#[contract]
pub struct TrustlineManagerContract;

#[contractimpl]
impl TrustlineManagerContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&Symbol::new(&env, "admin")) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().instance().set(&Symbol::new(&env, "trustlines"), &Map::<(Address, Address), bool>::new(&env));
    }

    pub fn add_trustline(&self, env: &Env, asset: Address, account: Address) {
        let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin")).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        let mut trustlines: Map<(Address, Address), bool> = env.storage().instance().get(&Symbol::new(env, "trustlines")).unwrap_or_else(|| Map::new(env));
        trustlines.set((asset, account), true);
        env.storage().instance().set(&Symbol::new(env, "trustlines"), &trustlines);
    }

    pub fn remove_trustline(&self, env: &Env, asset: Address, account: Address) {
        let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin")).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        let mut trustlines: Map<(Address, Address), bool> = env.storage().instance().get(&Symbol::new(env, "trustlines")).unwrap_or_else(|| Map::new(env));
        trustlines.set((asset, account), false);
        env.storage().instance().set(&Symbol::new(env, "trustlines"), &trustlines);
    }

    pub fn has_trustline(env: Env, asset: Address, account: Address) -> bool {
        let trustlines: Map<(Address, Address), bool> = env.storage().instance().get(&Symbol::new(&env, "trustlines")).unwrap_or_else(|| Map::new(&env));
        trustlines.get((asset, account)).unwrap_or(false)
    }
}

#[contract]
pub struct Sep41TokenRouterContract;

#[contractimpl]
impl Sep41TokenRouterContract {
    pub fn transfer(env: Env, token: Address, from: Address, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        from.require_auth();
        env.invoke_contract::<()>(&token, &Symbol::new(&env, "transfer"), (from, to, amount));
    }
}

#[contracttype]
#[derive(Clone)]
pub struct Milestone {
    pub recipient: Address,
    pub amount: i128,
    pub released_bps: u32,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&Symbol::new(&env, "admin")) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().instance().set(&Symbol::new(&env, "token"), &token);
        env.storage().instance().set(&Symbol::new(&env, "milestones"), &Map::<u32, Milestone>::new(&env));
    }

    pub fn create_milestone(&self, env: &Env, id: u32, recipient: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin")).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        let mut milestones: Map<u32, Milestone> = env.storage().instance().get(&Symbol::new(env, "milestones")).unwrap_or_else(|| Map::new(env));
        if milestones.contains_key(id) {
            panic!("Milestone already exists");
        }
        milestones.set(id, Milestone { recipient, amount, released_bps: 0 });
        env.storage().instance().set(&Symbol::new(env, "milestones"), &milestones);
    }

    pub fn fund_milestone(&self, env: &Env, id: u32, funder: Address) {
        funder.require_auth();
        let milestones: Map<u32, Milestone> = env.storage().instance().get(&Symbol::new(env, "milestones")).unwrap_or_else(|| Map::new(env));
        if !milestones.contains_key(id) {
            panic!("Milestone not found");
        }
        let milestone = milestones.get(id).unwrap();
        let token: Address = env.storage().instance().get(&Symbol::new(env, "token")).unwrap();
        let escrow = env.current_contract_address();
        env.invoke_contract::<()>(&token, &Symbol::new(env, "transfer"), (funder, escrow, milestone.amount));
    }

    pub fn release_milestone(&self, env: &Env, id: u32, percentage_bps: u32) {
        if percentage_bps == 0 || percentage_bps > 10_000 {
            panic!("Percentage must be between 1 and 10000 basis points");
        }
        let mut milestones: Map<u32, Milestone> = env.storage().instance().get(&Symbol::new(env, "milestones")).unwrap_or_else(|| Map::new(env));
        let mut milestone = milestones.get(id).unwrap_or_else(|| panic!("Milestone not found"));
        if percentage_bps <= milestone.released_bps {
            panic!("Release percentage must increase");
        }
        let release_amount = milestone.amount * (percentage_bps - milestone.released_bps) as i128 / 10_000;
        let token: Address = env.storage().instance().get(&Symbol::new(env, "token")).unwrap();
        let escrow = env.current_contract_address();
        env.invoke_contract::<()>(&token, &Symbol::new(env, "transfer"), (escrow, milestone.recipient.clone(), release_amount));
        milestone.released_bps = percentage_bps;
        milestones.set(id, milestone);
        env.storage().instance().set(&Symbol::new(env, "milestones"), &milestones);
    }

    pub fn get_milestone(env: Env, id: u32) -> Milestone {
        let milestones: Map<u32, Milestone> = env.storage().instance().get(&Symbol::new(&env, "milestones")).unwrap_or_else(|| Map::new(&env));
        milestones.get(id).unwrap_or_else(|| panic!("Milestone not found"))
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

#[contract]
pub struct WrappedAssetBridgeContract;

#[contractimpl]
impl WrappedAssetBridgeContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&Symbol::new(&env, "admin")) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().instance().set(&Symbol::new(&env, "native_token"), &Address::random(&env));
        env.storage().instance().set(&Symbol::new(&env, "wrapped_balances"), &Map::<Address, Map<Address, i128>>::new(&env));
        env.storage().instance().set(&Symbol::new(&env, "wrapped_tokens"), &Map::<Address, Address>::new(&env));
    }

    pub fn wrap(&self, env: &Env, caller: Address, native_asset: Address, amount: i128) {
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        caller.require_auth();

        let mut wrapped_balances: Map<Address, Map<Address, i128>> =
            env.storage().instance().get(&Symbol::new(&env, "wrapped_balances")).unwrap_or_else(|| Map::new(env));
        let mut user_balances = wrapped_balances.get(caller.clone()).unwrap_or_else(|| Map::new(env));

        let current = user_balances.get(native_asset.clone()).unwrap_or(0);
        user_balances.set(native_asset.clone(), current + amount);
        wrapped_balances.set(caller.clone(), user_balances);
        env.storage().instance().set(&Symbol::new(&env, "wrapped_balances"), &wrapped_balances);

        env.events().publish(
            (Symbol::new(&env, "asset_wrapped"), &caller),
            (native_asset, amount),
        );
    }

    pub fn unwrap(&self, env: &Env, caller: Address, native_asset: Address, amount: i128) {
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        caller.require_auth();

        let mut wrapped_balances: Map<Address, Map<Address, i128>> =
            env.storage().instance().get(&Symbol::new(&env, "wrapped_balances")).unwrap_or_else(|| Map::new(env));
        let mut user_balances = wrapped_balances.get(caller.clone()).unwrap_or_else(|| Map::new(env));

        let current = user_balances.get(native_asset.clone()).unwrap_or(0);
        if current < amount {
            panic!("Insufficient wrapped balance");
        }
        user_balances.set(native_asset.clone(), current - amount);
        wrapped_balances.set(caller.clone(), user_balances);
        env.storage().instance().set(&Symbol::new(&env, "wrapped_balances"), &wrapped_balances);

        env.events().publish(
            (Symbol::new(&env, "asset_unwrapped"), &caller),
            (native_asset, amount),
        );
    }

    pub fn get_wrapped_balance(env: Env, holder: Address, native_asset: Address) -> i128 {
        let wrapped_balances: Map<Address, Map<Address, i128>> =
            env.storage().instance().get(&Symbol::new(&env, "wrapped_balances")).unwrap_or_else(|| Map::new(&env));
        let user_balances = wrapped_balances.get(holder).unwrap_or_else(|| Map::new(&env));
        user_balances.get(native_asset).unwrap_or(0)
    }

    pub fn register_wrapped_token(&self, env: &Env, native_asset: Address, wrapped_token: Address) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, "admin")).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut wrapped_tokens: Map<Address, Address> =
            env.storage().instance().get(&Symbol::new(&env, "wrapped_tokens")).unwrap_or_else(|| Map::new(env));
        wrapped_tokens.set(native_asset, wrapped_token);
        env.storage().instance().set(&Symbol::new(&env, "wrapped_tokens"), &wrapped_tokens);
    }

    pub fn get_wrapped_token(env: Env, native_asset: Address) -> Option<Address> {
        let wrapped_tokens: Map<Address, Address> =
            env.storage().instance().get(&Symbol::new(&env, "wrapped_tokens")).unwrap_or_else(|| Map::new(&env));
        wrapped_tokens.get(native_asset)
    }
}

#[contract]
pub struct TokenMetadataContract;

#[contractimpl]
impl TokenMetadataContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&Symbol::new(&env, "admin")) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().instance().set(&Symbol::new(&env, "metadata"), &Map::<Address, Symbol>::new(&env));
        env.storage().instance().set(&Symbol::new(&env, "icons"), &Map::<Address, Symbol>::new(&env));
        env.storage().instance().set(&Symbol::new(&env, "descriptions"), &Map::<Address, Symbol>::new(&env));
    }

    pub fn set_metadata(&self, env: &Env, asset: Address, name: Symbol, icon: Symbol, description: Symbol) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, "admin")).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut metadata: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "metadata")).unwrap_or_else(|| Map::new(env));
        metadata.set(asset.clone(), name);
        env.storage().instance().set(&Symbol::new(&env, "metadata"), &metadata);

        let mut icons: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "icons")).unwrap_or_else(|| Map::new(env));
        icons.set(asset.clone(), icon);
        env.storage().instance().set(&Symbol::new(&env, "icons"), &icons);

        let mut descriptions: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "descriptions")).unwrap_or_else(|| Map::new(env));
        descriptions.set(asset, description);
        env.storage().instance().set(&Symbol::new(&env, "descriptions"), &descriptions);
    }

    pub fn get_name(env: Env, asset: Address) -> Option<Symbol> {
        let metadata: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "metadata")).unwrap_or_else(|| Map::new(&env));
        metadata.get(asset)
    }

    pub fn get_icon(env: Env, asset: Address) -> Option<Symbol> {
        let icons: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "icons")).unwrap_or_else(|| Map::new(&env));
        icons.get(asset)
    }

    pub fn get_description(env: Env, asset: Address) -> Option<Symbol> {
        let descriptions: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "descriptions")).unwrap_or_else(|| Map::new(&env));
        descriptions.get(asset)
    }

    pub fn has_metadata(env: Env, asset: Address) -> bool {
        let metadata: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "metadata")).unwrap_or_else(|| Map::new(&env));
        metadata.get(asset).is_some()
    }

    pub fn remove_metadata(&self, env: &Env, asset: Address) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, "admin")).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut metadata: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "metadata")).unwrap_or_else(|| Map::new(env));
        metadata.set(asset.clone(), Symbol::new(&env, ""));

        let mut icons: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "icons")).unwrap_or_else(|| Map::new(env));
        icons.set(asset.clone(), Symbol::new(&env, ""));

        let mut descriptions: Map<Address, Symbol> =
            env.storage().instance().get(&Symbol::new(&env, "descriptions")).unwrap_or_else(|| Map::new(env));
        descriptions.set(asset, Symbol::new(&env, ""));

        env.storage().instance().set(&Symbol::new(&env, "metadata"), &metadata);
        env.storage().instance().set(&Symbol::new(&env, "icons"), &icons);
        env.storage().instance().set(&Symbol::new(&env, "descriptions"), &descriptions);
    }
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub struct Proposal {
    pub id: u32,
    pub author: Address,
    pub title: Symbol,
    pub start_time: u64,
    pub end_time: u64,
    pub executed: bool,
}

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    pub fn initialize(env: Env, admin: Address, governance_token: Address) {
        if env.storage().instance().has(&Symbol::new(&env, "admin")) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().instance().set(&Symbol::new(&env, "governance_token"), &governance_token);
        env.storage().instance().set(&Symbol::new(&env, "proposal_count"), &0u32);
        env.storage().instance().set(&Symbol::new(&env, "quorum_bps"), &1000u32);
        env.storage().instance().set(&Symbol::new(&env, "proposals"), &Map::<u32, Proposal>::new(&env));
        env.storage().instance().set(&Symbol::new(&env, "votes_for"), &Map::<u32, i128>::new(&env));
        env.storage().instance().set(&Symbol::new(&env, "votes_against"), &Map::<u32, i128>::new(&env));
        env.storage().instance().set(&Symbol::new(&env, "has_voted"), &Map::<(u32, Address), bool>::new(&env));
    }

    pub fn create_proposal(&self, env: &Env, author: Address, title: Symbol, duration: u64) {
        author.require_auth();

        let current_time = env.ledger().timestamp();
        let mut proposal_count: u32 = env.storage().instance().get(&Symbol::new(&env, "proposal_count")).unwrap_or(0);
        let id = proposal_count + 1;

        let proposal = Proposal {
            id,
            author: author.clone(),
            title: title.clone(),
            start_time: current_time,
            end_time: current_time + duration,
            executed: false,
        };

        let mut proposals: Map<u32, Proposal> =
            env.storage().instance().get(&Symbol::new(&env, "proposals")).unwrap_or_else(|| Map::new(env));
        proposals.set(id, proposal);
        env.storage().instance().set(&Symbol::new(&env, "proposals"), &proposals);
        env.storage().instance().set(&Symbol::new(&env, "proposal_count"), &id);

        let mut votes_for: Map<u32, i128> =
            env.storage().instance().get(&Symbol::new(&env, "votes_for")).unwrap_or_else(|| Map::new(env));
        votes_for.set(id, 0);
        env.storage().instance().set(&Symbol::new(&env, "votes_for"), &votes_for);

        let mut votes_against: Map<u32, i128> =
            env.storage().instance().get(&Symbol::new(&env, "votes_against")).unwrap_or_else(|| Map::new(env));
        votes_against.set(id, 0);
        env.storage().instance().set(&Symbol::new(&env, "votes_against"), &votes_against);

        env.events().publish(
            (Symbol::new(&env, "proposal_created"), &author),
            (id, title),
        );
    }

    pub fn cast_vote(&self, env: &Env, proposal_id: u32, voter: Address, in_favor: bool) {
        voter.require_auth();

        let proposals: Map<u32, Proposal> =
            env.storage().instance().get(&Symbol::new(&env, "proposals")).unwrap_or_else(|| Map::new(env));
        let proposal = proposals.get(proposal_id).unwrap_or_else(|| panic!("Proposal not found"));

        let current_time = env.ledger().timestamp();
        if current_time < proposal.start_time || current_time > proposal.end_time {
            panic!("Voting period is not active");
        }

        let has_voted: Map<(u32, Address), bool> =
            env.storage().instance().get(&Symbol::new(&env, "has_voted")).unwrap_or_else(|| Map::new(env));
        if has_voted.get((proposal_id, voter.clone())).unwrap_or(false) {
            panic!("Voter has already voted on this proposal");
        }

        let governance_token: Address = env.storage().instance().get(&Symbol::new(&env, "governance_token")).unwrap();
        let vote_weight: i128 = env.invoke_contract(&governance_token, &Symbol::new(&env, "balance"), (&voter,));

        if vote_weight <= 0 {
            panic!("Voter has no governance tokens");
        }

        if in_favor {
            let mut votes_for: Map<u32, i128> =
                env.storage().instance().get(&Symbol::new(&env, "votes_for")).unwrap_or_else(|| Map::new(env));
            let current = votes_for.get(proposal_id).unwrap_or(0);
            votes_for.set(proposal_id, current + vote_weight);
            env.storage().instance().set(&Symbol::new(&env, "votes_for"), &votes_for);
        } else {
            let mut votes_against: Map<u32, i128> =
                env.storage().instance().get(&Symbol::new(&env, "votes_against")).unwrap_or_else(|| Map::new(env));
            let current = votes_against.get(proposal_id).unwrap_or(0);
            votes_against.set(proposal_id, current + vote_weight);
            env.storage().instance().set(&Symbol::new(&env, "votes_against"), &votes_against);
        }

        let mut has_voted_mut: Map<(u32, Address), bool> =
            env.storage().instance().get(&Symbol::new(&env, "has_voted")).unwrap_or_else(|| Map::new(env));
        has_voted_mut.set((proposal_id, voter.clone()), true);
        env.storage().instance().set(&Symbol::new(&env, "has_voted"), &has_voted_mut);

        env.events().publish(
            (Symbol::new(&env, "vote_cast"), &voter),
            (proposal_id, in_favor, vote_weight),
        );
    }

    pub fn execute_proposal(&self, env: &Env, proposal_id: u32) {
        let mut proposals: Map<u32, Proposal> =
            env.storage().instance().get(&Symbol::new(&env, "proposals")).unwrap_or_else(|| Map::new(env));
        let mut proposal = proposals.get(proposal_id).unwrap_or_else(|| panic!("Proposal not found"));

        if proposal.executed {
            panic!("Proposal already executed");
        }

        let current_time = env.ledger().timestamp();
        if current_time <= proposal.end_time {
            panic!("Voting period has not ended");
        }

        let votes_for: Map<u32, i128> =
            env.storage().instance().get(&Symbol::new(&env, "votes_for")).unwrap_or_else(|| Map::new(&env));
        let votes_against: Map<u32, i128> =
            env.storage().instance().get(&Symbol::new(&env, "votes_against")).unwrap_or_else(|| Map::new(&env));

        let for_votes = votes_for.get(proposal_id).unwrap_or(0);
        let against_votes = votes_against.get(proposal_id).unwrap_or(0);

        if for_votes <= against_votes {
            proposal.executed = true;
            proposals.set(proposal_id, proposal);
            env.storage().instance().set(&Symbol::new(&env, "proposals"), &proposals);
            env.events().publish(
                (Symbol::new(&env, "proposal_rejected"), &proposal.author),
                (proposal_id, for_votes, against_votes),
            );
            return;
        }

        proposal.executed = true;
        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&Symbol::new(&env, "proposals"), &proposals);

        env.events().publish(
            (Symbol::new(&env, "proposal_executed"), &proposal.author),
            (proposal_id, for_votes, against_votes),
        );
    }

    pub fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        let proposals: Map<u32, Proposal> =
            env.storage().instance().get(&Symbol::new(&env, "proposals")).unwrap_or_else(|| Map::new(&env));
        proposals.get(proposal_id).unwrap_or_else(|| panic!("Proposal not found"))
    }

    pub fn get_vote_tally(env: Env, proposal_id: u32) -> (i128, i128) {
        let votes_for: Map<u32, i128> =
            env.storage().instance().get(&Symbol::new(&env, "votes_for")).unwrap_or_else(|| Map::new(&env));
        let votes_against: Map<u32, i128> =
            env.storage().instance().get(&Symbol::new(&env, "votes_against")).unwrap_or_else(|| Map::new(&env));
        let for_votes = votes_for.get(proposal_id).unwrap_or(0);
        let against_votes = votes_against.get(proposal_id).unwrap_or(0);
        (for_votes, against_votes)
    }

    pub fn has_voted(env: Env, proposal_id: u32, voter: Address) -> bool {
        let has_voted_map: Map<(u32, Address), bool> =
            env.storage().instance().get(&Symbol::new(&env, "has_voted")).unwrap_or_else(|| Map::new(&env));
        has_voted_map.get((proposal_id, voter)).unwrap_or(false)
    }

    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage().instance().get(&Symbol::new(&env, "proposal_count")).unwrap_or(0)
    }

    pub fn set_quorum(&self, env: &Env, quorum_bps: u32) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, "admin")).unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        if quorum_bps > 10_000 {
            panic!("Quorum must be between 0 and 10000 basis points");
        }
        env.storage().instance().set(&Symbol::new(&env, "quorum_bps"), &quorum_bps);
    }
}
