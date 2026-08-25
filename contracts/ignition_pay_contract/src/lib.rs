#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec, Map};
use crate::MultiOracleContractClient;

const MAX_CALLS_PER_LEDGER: u32 = 5;

#[contract]
pub struct IgnitionPayContract;

#[contractimpl]
impl IgnitionPayContract {
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&"admin", &admin);
        env.storage().instance().set(&"authorizations", &Vec::<Address>::new(&env));
        env.storage().instance().set(&"rate_limit", &Map::<Address, (u32, u32)>::new(&env));
        env.storage().instance().set(&"kyc_status", &Map::<Address, bool>::new(&env));
    }

    fn check_rate_limit(&self, env: &Env, user: &Address) {
        let mut rate_limit: Map<Address, (u32, u32)> = env.storage().instance().get(&"rate_limit").unwrap_or_else(|| Map::new(env));
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

        env.storage().instance().set(&"rate_limit", &rate_limit);
    }

    pub fn set_kyc_status(&self, env: &Env, user: &Address, kyc_completed: bool) {
        let admin = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut kyc_status: Map<Address, bool> = env.storage().instance().get(&"kyc_status").unwrap_or_else(|| Map::new(env));
        kyc_status.set(user.clone(), kyc_completed);
        env.storage().instance().set(&"kyc_status", &kyc_status);
    }

    pub fn authorize(env: Env, user: Address) {
        let admin = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        self.check_rate_limit(&env, &admin);

        let kyc_status: Map<Address, bool> = env.storage().instance().get(&"kyc_status").unwrap_or_else(|| Map::new(&env));
        if !kyc_status.get(user.clone()).unwrap_or(false) {
            panic!("KYC not completed");
        }

        let mut authorizations: Vec<Address> = env.storage().instance().get(&"authorizations").unwrap_or_else(|| Vec::new(&env));
        authorizations.push_back(user);
        env.storage().instance().set(&"authorizations", &authorizations);
    }

    pub fn revoke(env: Env, user: Address) {
        let admin = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        self.check_rate_limit(&env, &admin);

        let mut authorizations: Vec<Address> = env.storage().instance().get(&"authorizations").unwrap_or_else(|| Vec::new(&env));
        if let Some(index) = authorizations.iter().position(|a| a == user) {
            authorizations.remove(index as u32);
        }
        env.storage().instance().set(&"authorizations", &authorizations);
    }

    pub fn is_authorized(env: Env, user: Address) -> bool {
        let authorizations: Vec<Address> = env.storage().instance().get(&"authorizations").unwrap_or_else(|| Vec::new(&env));
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